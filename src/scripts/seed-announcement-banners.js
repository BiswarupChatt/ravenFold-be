import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import { connectMongoDB, disconnectMongoDB } from '@/infrastructure/database/mongodb.js';
import AnnouncementBanner from '@/modules/announcement-banner/models/announcement-banner.model.js';

const addDays = (date, days) => {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
};

const buildSeedBanners = () => {
  const now = new Date();

  return [
    {
      title: 'Diwali Sale Live',
      message: 'Festive offers are running across selected Raven Fold styles.',
      ctaLabel: 'Shop now',
      ctaUrl: '/shop',
      variant: 'FESTIVE',
      backgroundColor: '#7f1d1d',
      textColor: '#fff7ed',
      isActive: true,
      startDate: addDays(now, -1),
      endDate: addDays(now, 14),
      priority: 60,
    },
    {
      title: 'Free Shipping Weekend',
      message: 'Free shipping is available for prepaid orders this weekend.',
      ctaLabel: 'View cart',
      ctaUrl: '/cart',
      variant: 'INFO',
      backgroundColor: '#0f766e',
      textColor: '#ffffff',
      isActive: true,
      startDate: addDays(now, -1),
      endDate: addDays(now, 5),
      priority: 50,
    },
    {
      title: 'Checkout Update',
      message: 'Some COD orders may need extra confirmation before dispatch.',
      ctaLabel: 'Contact us',
      ctaUrl: '/contacts',
      variant: 'WARNING',
      backgroundColor: '#92400e',
      textColor: '#fff7ed',
      isActive: true,
      startDate: addDays(now, -1),
      endDate: addDays(now, 30),
      priority: 40,
    },
    {
      title: 'New Drop',
      message: 'Fresh styles just landed in the store.',
      ctaLabel: 'Explore',
      ctaUrl: '/shop',
      variant: 'DEFAULT',
      backgroundColor: '#1e2952',
      textColor: '#ffffff',
      isActive: true,
      startDate: addDays(now, -1),
      endDate: addDays(now, 21),
      priority: 30,
    },
    {
      title: 'Limited Time Offer',
      message: 'Manual banner content can be updated anytime from admin.',
      ctaLabel: 'Shop deals',
      ctaUrl: '/shop',
      variant: 'SALE',
      backgroundColor: '#d9461f',
      textColor: '#ffffff',
      isActive: true,
      startDate: addDays(now, -1),
      endDate: addDays(now, 10),
      priority: 20,
    },
    {
      title: 'Gift Ready',
      message: 'Gift-friendly packaging is available on selected orders.',
      ctaLabel: '',
      ctaUrl: '',
      variant: 'DEFAULT',
      backgroundColor: '#18181b',
      textColor: '#ffffff',
      isActive: true,
      startDate: addDays(now, -1),
      endDate: null,
      priority: 10,
    },
  ].map((banner) => ({
    ...banner,
    placement: 'TOP_NAVBAR',
  }));
};

const seedAnnouncementBanners = async () => {
  await connectMongoDB();

  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is not connected. Check MONGO_URI and MONGO_DB_NAME.');
  }

  const seedBanners = buildSeedBanners();

  await Promise.all(seedBanners.map((banner) => (
    AnnouncementBanner.findOneAndUpdate(
      { title: banner.title },
      {
        $set: banner,
      },
      {
        returnDocument: 'after',
        setDefaultsOnInsert: true,
        upsert: true,
      },
    ).exec()
  )));

  console.log(`Seeded ${seedBanners.length} announcement banners.`);
  console.log('Open admin Other > Announcement Banners to edit them.');
  console.log('Open the storefront to see the highest priority active banner above the navbar.');
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedAnnouncementBanners()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectMongoDB();
    });
}

export { seedAnnouncementBanners };
