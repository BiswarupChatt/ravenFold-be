import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import { normalizeUserNameParts } from '@/common/utils/user-name.util.js';
import { connectMongoDB, disconnectMongoDB } from '@/infrastructure/database/mongodb.js';
import User from '@/modules/users/models/user.model.js';

const migrateUserNameParts = async () => {
  await connectMongoDB();

  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is not connected. Check MONGO_URI and MONGO_DB_NAME.');
  }

  const users = await User.find({}).exec();
  let updatedCount = 0;

  for (const user of users) {
    const normalizedName = normalizeUserNameParts({
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
    });
    const hasChanged = (
      user.firstName !== normalizedName.firstName
      || user.lastName !== normalizedName.lastName
      || user.name !== normalizedName.name
    );

    if (!hasChanged) {
      continue;
    }

    user.firstName = normalizedName.firstName;
    user.lastName = normalizedName.lastName;
    user.name = normalizedName.name;
    await user.save();
    updatedCount += 1;
  }

  console.log(`Processed ${users.length} users.`);
  console.log(`Updated ${updatedCount} users with firstName and lastName fields.`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrateUserNameParts()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectMongoDB();
    });
}

export { migrateUserNameParts };
