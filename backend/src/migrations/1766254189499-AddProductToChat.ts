import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductToChat1766254189499 implements MigrationInterface {
    name = 'AddProductToChat1766254189499'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ✅ 1. productId kolonu var mı kontrol et
        const hasProductIdColumn = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'chats' AND column_name = 'productId'
        `);

        if (hasProductIdColumn.length === 0) {
            // productId yoksa ekle
            await queryRunner.query(`
                ALTER TABLE "chats" 
                ADD "productId" uuid
            `);
            console.log('✅ productId kolonu eklendi');
        } else {
            console.log('⏭️  productId kolonu zaten var, atlanıyor');
        }

        // ✅ 2. Foreign key var mı kontrol et
        const hasForeignKey = await queryRunner.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'chats' 
            AND constraint_name = 'FK_chats_product'
        `);

        if (hasForeignKey.length === 0) {
            await queryRunner.query(`
                ALTER TABLE "chats" 
                ADD CONSTRAINT "FK_chats_product" 
                FOREIGN KEY ("productId") 
                REFERENCES "products"("id") 
                ON DELETE SET NULL
            `);
            console.log('✅ Foreign key eklendi');
        } else {
            console.log('⏭️  Foreign key zaten var, atlanıyor');
        }

        // ✅ 3. Index var mı kontrol et
        const hasIndex = await queryRunner.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'chats' 
            AND indexname = 'IDX_chats_productId'
        `);

        if (hasIndex.length === 0) {
            await queryRunner.query(`
                CREATE INDEX "IDX_chats_productId" 
                ON "chats"("productId")
            `);
            console.log('✅ Index eklendi');
        } else {
            console.log('⏭️  Index zaten var, atlanıyor');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_chats_productId"`);
        await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT IF EXISTS "FK_chats_product"`);
        await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN IF EXISTS "productId"`);
    }
}