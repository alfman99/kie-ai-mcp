# Upload Media

Use `kie_upload_media`. It routes exactly one source through KIE's native File Upload API.

## Source Selection

- `local_file`: set `source` to an absolute path inside `KIE_LOCAL_UPLOAD_ROOT`. This uses KIE's multipart stream endpoint and requires local uploads to be enabled.
- `url`: set `source` to a public HTTP or HTTPS URL. KIE downloads it server-side.
- `base64`: set `source` to raw base64 or a data URL. Prefer this only for small files.

Set `uploadPath` to a stable path without leading or trailing slashes. Use `agent-uploads` when no project-specific path is needed. Set `fileName` when downstream model behavior or file extension detection needs a deterministic name.

After upload, pass the returned `data.downloadUrl` to the creation tool's URL input. KIE upload URLs are temporary. Do not present them as permanent storage.

Never widen `KIE_LOCAL_UPLOAD_ROOT` to a home directory, repository root, or drive root. Move intended references into the dedicated media folder. The server rejects traversal and symlinks that leave it.

Official sources:

- [URL upload](https://docs.kie.ai/file-upload-api/upload-file-url)
- [Base64 upload](https://docs.kie.ai/file-upload-api/upload-file-base-64)
- [Stream upload](https://docs.kie.ai/file-upload-api/upload-file-stream)
