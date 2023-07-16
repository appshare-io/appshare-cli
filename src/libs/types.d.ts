
type StorageErrorPayload = {
    error: string;
    status: number;
    message: string;
};

interface FileResponse {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    etag: string;
    createdAt: string;
    bucketId: string;
    isUploaded: true;
    updatedAt: string;
    uploadedByUserId: string;
}

type StorageUploadFileResponse = {
    fileMetadata: FileResponse;
    error: null;
} | {
    fileMetadata: null;
    error: StorageErrorPayload;
};

type StorageUploadFormDataResponse = {
    fileMetadata: {
        processedFiles: FileResponse[];
    };
    error: null;
} | {
    fileMetadata: null;
    error: StorageErrorPayload;
};

type StorageUploadResponse = StorageUploadFileResponse | StorageUploadFormDataResponse;