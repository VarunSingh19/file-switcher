import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Command exists", async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes("file-switcher.showQuickPick"));
  });
});
