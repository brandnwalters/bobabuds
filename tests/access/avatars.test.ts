import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { type Bud, newBud } from "./support/buds";
import { anonClient } from "./support/supabase";

const BUCKET = "avatars";

function fakeAvatar(label = "avatar", type = "image/webp") {
  return new Blob([`not really an image: ${label}`], { type });
}

/** Uploads an avatar into `owner`'s folder as `uploader`; returns the path. */
async function upload(uploader: Bud, owner: Bud = uploader, type = "image/webp") {
  const path = `${owner.user.id}/${randomUUID()}.webp`;
  const { error } = await uploader.client.storage
    .from(BUCKET)
    .upload(path, fakeAvatar("avatar", type), { contentType: type });
  return { path, error };
}

async function canDownload(viewer: Bud, path: string) {
  const { data, error } = await viewer.client.storage.from(BUCKET).download(path);
  return !error && data !== null;
}

describe("Avatar storage", () => {
  it("any signed-in user can load anyone's avatar, even a stranger's", async () => {
    const owner = await newBud();
    const stranger = await newBud();
    const { path, error } = await upload(owner);
    expect(error).toBeNull();

    expect(await canDownload(owner, path)).toBe(true);
    expect(await canDownload(stranger, path)).toBe(true);
    const { data: signed } = await stranger.client.storage
      .from(BUCKET)
      .createSignedUrl(path, 60);
    expect(signed?.signedUrl).toBeTruthy();
  });

  it("signed-out visitors can't load avatars", async () => {
    const owner = await newBud();
    const { path } = await upload(owner);

    const { data, error } = await anonClient().storage.from(BUCKET).download(path);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("nobody can upload into another user's avatar folder", async () => {
    const owner = await newBud();
    const other = await newBud();

    const { error } = await upload(other, owner);
    expect(error).not.toBeNull();
  });

  it("only the owner can replace or delete their avatar", async () => {
    const owner = await newBud();
    const other = await newBud();
    const { path } = await upload(owner);

    const replaced = await other.client.storage
      .from(BUCKET)
      .update(path, fakeAvatar("hijack"), { contentType: "image/webp" });
    expect(replaced.error).not.toBeNull();

    // Storage reports success with no rows when RLS hides the object.
    await other.client.storage.from(BUCKET).remove([path]);
    expect(await canDownload(owner, path)).toBe(true);

    const ownReplace = await owner.client.storage
      .from(BUCKET)
      .update(path, fakeAvatar("new me"), { contentType: "image/webp" });
    expect(ownReplace.error).toBeNull();

    const { data: removed } = await owner.client.storage.from(BUCKET).remove([path]);
    expect(removed).toHaveLength(1);
    expect(await canDownload(owner, path)).toBe(false);
  });

  it("only images are accepted", async () => {
    const owner = await newBud();
    const { error } = await upload(owner, owner, "text/html");
    expect(error).not.toBeNull();
  });
});

describe("profiles.avatar_path", () => {
  it("a user can point their profile at an avatar in their own folder", async () => {
    const owner = await newBud();
    const { path } = await upload(owner);

    const { error } = await owner.client
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", owner.user.id);
    expect(error).toBeNull();
  });

  it("a user can't point their profile at someone else's avatar", async () => {
    const owner = await newBud();
    const other = await newBud();
    const { path } = await upload(owner);

    const { error } = await other.client
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", other.user.id);
    expect(error).not.toBeNull();
  });
});
