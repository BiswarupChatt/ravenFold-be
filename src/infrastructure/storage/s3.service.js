async function uploadFile() {
  throw new Error('S3 upload is not configured yet');
}

async function deleteFile() {
  throw new Error('S3 delete is not configured yet');
}

export { deleteFile, uploadFile };

export default {
  deleteFile,
  uploadFile,
};