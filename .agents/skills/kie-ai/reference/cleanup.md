# Cleanup

1. Close every diagnostic MCP client and transport.
2. Confirm no child process from the diagnostic remains.
3. Remove only temporary files and directories created by the current diagnostic.
4. Confirm `git status --short` contains only intentional project changes.

Do not delete user media, generated KIE results, catalog snapshots, credentials, or unrelated processes.
