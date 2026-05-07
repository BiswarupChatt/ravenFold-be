const uploadFile = async () => {
  throw new Error('S3 upload is not configured yet');
};

const deleteFile = async () => {
  throw new Error('S3 delete is not configured yet');
};

export { deleteFile, uploadFile };

export default {
  deleteFile,
  uploadFile,
};
