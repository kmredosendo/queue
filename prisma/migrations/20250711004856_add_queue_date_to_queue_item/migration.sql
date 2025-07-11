-- DropForeignKey
ALTER TABLE `queue_items` DROP FOREIGN KEY `queue_items_laneId_fkey`;

-- AlterTable
ALTER TABLE `queue_items` MODIFY `queueDate` DATETIME(3) NOT NULL;

-- AddForeignKey
ALTER TABLE `queue_items` ADD CONSTRAINT `queue_items_laneId_fkey` FOREIGN KEY (`laneId`) REFERENCES `lanes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
