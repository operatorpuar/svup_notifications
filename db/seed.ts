import { db, FCMToken, Notification } from 'astro:db';

// https://astro.build/db/seed
export default async function seed() {
	// Seed FCM tokens for development
	await db.insert(FCMToken).values([
		{
			id: 1,
			username: 'testuser1',
			fcm_token: 'test_fcm_token_1234567890',
			created_at: new Date('2024-01-15T10:00:00Z'),
			updated_at: new Date('2024-01-15T10:00:00Z')
		},
		{
			id: 2,
			username: 'testuser2',
			fcm_token: 'test_fcm_token_0987654321',
			created_at: new Date('2024-01-16T14:30:00Z'),
			updated_at: new Date('2024-01-16T14:30:00Z')
		}
	]);

	// Seed notifications for development
	await db.insert(Notification).values([
		{
			id: 1,
			username: 'testuser1',
			notification_title: 'Вітаємо в системі СВУП',
			status: 'New',
			created_at: new Date('2024-01-15T10:05:00Z')
		},
		{
			id: 2,
			username: 'testuser1',
			notification_title: 'Нове повідомлення від адміністратора',
			status: 'New',
			created_at: new Date('2024-01-15T11:20:00Z')
		},
		{
			id: 3,
			username: 'testuser1',
			notification_title: 'Оновлення системи заплановано на завтра',
			status: 'Read',
			created_at: new Date('2024-01-14T09:00:00Z')
		},
		{
			id: 4,
			username: 'testuser2',
			notification_title: 'Ваш профіль успішно оновлено',
			status: 'New',
			created_at: new Date('2024-01-16T15:00:00Z')
		},
		{
			id: 5,
			username: 'testuser2',
			notification_title: 'Нагадування про зустріч',
			status: 'Read',
			created_at: new Date('2024-01-16T08:30:00Z')
		}
	]);
}
