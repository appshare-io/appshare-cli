import { AppshareStorageUrl, auth } from "../utils.ts";

export const fetchUpload = async (
  file: File,
  {
    id,
    name,
    bucketId,
    headers: initialHeaders = {},
  }: {
    bucketId?: string;
    id?: string;
    name?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<StorageUploadFileResponse> => {
  const data = new FormData();
  const accessToken = auth.getAccessToken();

  data.append("file[]", file);
  data.append("metadata[]", JSON.stringify({ id, name: name ?? file.name }));

  const headers: HeadersInit = {
    ...initialHeaders,
  };
  if (bucketId) {
    data.append("bucket-id", bucketId);
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const url = `${AppshareStorageUrl}/files`;

  // * Non-browser environment: XMLHttpRequest is not available
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: data, // * https://github.com/form-data/form-data/issues/513
    });

    const responseData = await response.json() as {
      processedFiles: FileResponse[];
      error?: {
        message: string;
      };
    };
    if (!response.ok) {
      const error: StorageErrorPayload = {
        status: response.status,
        message: responseData?.error?.message || response.statusText,
        // * errors from hasura-storage are not codified
        error: response.statusText,
      };
      return { error, fileMetadata: null };
    }
    const fileMetadata = responseData.processedFiles[0];
    return { fileMetadata, error: null };
  } catch (e) {
    const error: StorageErrorPayload = {
      status: 0,
      message: (e as Error).message,
      error: (e as Error).message,
    };
    return { error, fileMetadata: null };
  }
};
