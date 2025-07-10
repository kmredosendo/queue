/*
  Warnings:

  - The values [PWD_SENIOR] on the enum `lanes_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `lanes` MODIFY `type` ENUM('REGULAR', 'PRIORITY') NOT NULL DEFAULT 'REGULAR';
