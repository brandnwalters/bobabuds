import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { befriend, type Bud, createLog, newBud } from "./support/buds";

const BUCKET = "log-photos";

function fakePhoto(label = "photo") {
  return new Blob([`not really a webp: ${label}`], { type: "image/webp" });
}

/** Uploads a photo into `owner`'s folder as `uploader`; returns the path. */
async function upload(uploader: Bud, owner: Bud = uploader) {
  const path = `${owner.user.id}/${randomUUID()}.webp`;
  const { error } = await uploader.client.storage
    .from(BUCKET)
    .upload(path, fakePhoto(), { contentType: "image/webp" });
  return { path, error };
}

async function canDownload(viewer: Bud, path: string) {
  const { data, error } = await viewer.client.storage.from(BUCKET).download(path);
  return !error && data !== null;
}

async function canSign(viewer: Bud, path: string) {
  const { data, error } = await viewer.client.storage
    .from(BUCKET)
    .createSignedUrl(path, 60);
  return !error && !!data?.signedUrl;
}

describe("Log photo storage", () => {
  it("the author and their friends can load a Log photo; a stranger can't", async () => {
    const author = await newBud();
    const friend = await newBud();
    const stranger = await newBud();
    await befriend(author, friend);
    const { path, error } = await upload(author);
    expect(error).toBeNull();

    expect(await canDownload(author, path)).toBe(true);
    expect(await canDownload(friend, path)).toBe(true);
    expect(await canSign(friend, path)).toBe(true);

    expect(await canDownload(stranger, path)).toBe(false);
    expect(await canSign(stranger, path)).toBe(false);
  });

  it("a former friend loses access to the photos right after unfriending", async () => {
    const author = await newBud();
    const friend = await newBud();
    await befriend(author, friend);
    const { path } = await upload(author);
    expect(await canDownload(friend, path)).toBe(true);

    const { error } = await friend.client
      .from("friendships")
      .delete()
      .or(`user_a.eq.${author.user.id},user_b.eq.${author.user.id}`);
    expect(error).toBeNull();

    expect(await canDownload(friend, path)).toBe(false);
  });

  it("nobody can upload into another user's folder, even a friend", async () => {
    const owner = await newBud();
    const friend = await newBud();
    await befriend(owner, friend);

    const { error } = await upload(friend, owner);
    expect(error).not.toBeNull();
  });

  it("only the author can replace or delete their photo", async () => {
    const author = await newBud();
    const friend = await newBud();
    await befriend(author, friend);
    const { path } = await upload(author);

    const overwrite = await friend.client.storage
      .from(BUCKET)
      .update(path, fakePhoto("vandalised"), { contentType: "image/webp" });
    expect(overwrite.error).not.toBeNull();
    const { data: removedByFriend } = await friend.client.storage
      .from(BUCKET)
      .remove([path]);
    expect(removedByFriend ?? []).toHaveLength(0);
    expect(await canDownload(author, path)).toBe(true);

    const replaced = await author.client.storage
      .from(BUCKET)
      .update(path, fakePhoto("better shot"), { contentType: "image/webp" });
    expect(replaced.error).toBeNull();
    const { data: download } = await friend.client.storage
      .from(BUCKET)
      .download(path);
    expect(await download!.text()).toContain("better shot");

    const { data: removed, error } = await author.client.storage
      .from(BUCKET)
      .remove([path]);
    expect(error).toBeNull();
    expect(removed).toHaveLength(1);
    expect(await canDownload(author, path)).toBe(false);
  });

  it("only accepts images", async () => {
    const author = await newBud();
    const { error } = await author.client.storage
      .from(BUCKET)
      .upload(`${author.user.id}/${randomUUID()}.html`, new Blob(["<script>"]), {
        contentType: "text/html",
      });
    expect(error).not.toBeNull();
  });

  it("a Log can only point at a photo in its author's own folder", async () => {
    const author = await newBud();
    const other = await newBud();
    const { path } = await upload(author);

    const logId = await createLog(author, { photo_path: path });
    const { data } = await author.client
      .from("logs")
      .select("photo_path")
      .eq("id", logId)
      .single();
    expect(data?.photo_path).toBe(path);

    await expect(createLog(other, { photo_path: path })).rejects.toThrow();
    const { error } = await author.client
      .from("logs")
      .update({ photo_path: `${other.user.id}/${randomUUID()}.webp` })
      .eq("id", logId);
    expect(error).not.toBeNull();
  });
});
