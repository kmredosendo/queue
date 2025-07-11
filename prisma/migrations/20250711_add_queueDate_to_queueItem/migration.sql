-- Alter table to add queueDate as nullable
ALTER TABLE `queue_items` ADD COLUMN `queueDate` DATE NULL;

-- Backfill queueDate for all existing rows using createdAt (set to UTC midnight)
UPDATE `queue_items` SET `queueDate` = DATE(CONVERT_TZ(`createdAt`, '+00:00', '+00:00'));

-- Alter table to make queueDate required
ALTER TABLE `queue_items` MODIFY COLUMN `queueDate` DATE NOT NULL;

-- Drop old unique constraint
-- Drop foreign key constraint on laneId
ALTER TABLE `queue_items` DROP FOREIGN KEY `queue_items_laneId_fkey`;

-- Drop old unique constraint
ALTER TABLE `queue_items` DROP INDEX `queue_items_laneId_number_key`;

-- Recreate foreign key constraint on laneId
ALTER TABLE `queue_items` ADD CONSTRAINT `queue_items_laneId_fkey` FOREIGN KEY (`laneId`) REFERENCES `lanes`(`id`) ON DELETE CASCADE;

-- Add new unique constraint for (laneId, number, queueDate)
CREATE UNIQUE INDEX `queue_items_laneId_number_queueDate_key` ON `queue_items` (`laneId`, `number`, `queueDate`);
