import assert from "node:assert/strict";
import test from "node:test";

import { parseSaveDirectory } from "../app/save-parser/index";
import type { SaveFileLike } from "../app/save-parser/types";

function file(name: string, webkitRelativePath = name): SaveFileLike {
  return {
    name,
    webkitRelativePath,
    async arrayBuffer() {
      return new ArrayBuffer(0);
    },
  };
}

test("parses root save slots in order and isolates one damaged slot", async () => {
  const result = await parseSaveDirectory(
    [
      file("user3.dat", "Hollow Knight/user3.dat"),
      file("user2.dat", "Hollow Knight/user2.dat"),
      file("user1.dat", "Hollow Knight/user1.dat"),
      file("user1.dat", "Hollow Knight/backup/user1.dat"),
      file("readme.txt", "Hollow Knight/readme.txt"),
    ],
    async (_data, slotNumber) => {
      if (slotNumber === 2) throw new Error("damaged slot");
      return { slotId: `slot-${slotNumber}`, detail: { slotNumber } };
    },
  );

  assert.deepEqual(
    result.slots.map((slot) => slot.slotNumber),
    [1, 3],
  );
  assert.deepEqual(result.failures, [{ slot: 2, message: "damaged slot" }]);
  assert.equal(result.error, undefined);
});

test("reports a directory without root user1.dat to user4.dat files", async () => {
  const result = await parseSaveDirectory([
    file("user5.dat", "Hollow Knight/user5.dat"),
    file("user1.dat", "Hollow Knight/backup/user1.dat"),
    file("backup.dat", "Hollow Knight/backup.dat"),
  ]);

  assert.deepEqual(result.slots, []);
  assert.deepEqual(result.failures, []);
  assert.equal(result.error, "未找到可解析的空洞骑士存档");
});

test("reports an all-damaged directory while preserving per-slot failures", async () => {
  const result = await parseSaveDirectory(
    [file("user1.dat", "Hollow Knight/user1.dat")],
    async () => {
      throw new Error("invalid Team Cherry data");
    },
  );

  assert.deepEqual(result.slots, []);
  assert.deepEqual(result.failures, [
    { slot: 1, message: "invalid Team Cherry data" },
  ]);
  assert.equal(result.error, "未找到可解析的空洞骑士存档");
});
