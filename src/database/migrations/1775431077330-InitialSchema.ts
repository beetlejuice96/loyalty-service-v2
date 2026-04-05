import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1775431077330 implements MigrationInterface {
    name = 'InitialSchema1775431077330'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "apple_device_registrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "device_library_id" character varying NOT NULL, "push_token" character varying NOT NULL, "pass_type_id" character varying NOT NULL, "serial_number" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a15b3d4ee83d4aba88120e9d5c9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "logo_url" character varying, "primary_color" character varying NOT NULL DEFAULT '#000000', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc" UNIQUE ("slug"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "full_name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying NOT NULL, "points_balance" integer NOT NULL DEFAULT '0', "qr_code" character varying NOT NULL, "gw_object_id" character varying, "aw_serial_number" character varying, "aw_auth_token" character varying, "state" character varying NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_28518e7b408a87c698b4486e2de" UNIQUE ("qr_code"), CONSTRAINT "PK_28b53062261b996d9c99fa12404" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "point_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "member_id" uuid NOT NULL, "delta" integer NOT NULL, "type" character varying NOT NULL, "notes" text, "performed_by" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ceb5185b63f070e23d65509b0a7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tenant_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "user_id" character varying NOT NULL, "role" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8ce1bc9e3a5887c234900365447" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "loyalty_programs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "program_name" character varying NOT NULL, "points_per_scan" integer NOT NULL DEFAULT '10', "gw_issuer_id" character varying, "gw_class_id" character varying, "gw_service_account_json" text, "aw_pass_type_identifier" character varying, "aw_team_identifier" character varying, "aw_certificate" text, "aw_private_key" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_4305a2cd678b5dfc644e24ab84" UNIQUE ("tenant_id"), CONSTRAINT "PK_9911f010986d7730cc744f91ff4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "members" ADD CONSTRAINT "FK_844f9f34eaefdb094ef9664dc65" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "point_transactions" ADD CONSTRAINT "FK_d7805895b03f54d3d1cf56d72eb" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "point_transactions" ADD CONSTRAINT "FK_b68493c9762bcc0a65f89316819" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD CONSTRAINT "FK_85a7f13b3f434940151fb44f4c1" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loyalty_programs" ADD CONSTRAINT "FK_4305a2cd678b5dfc644e24ab84c" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loyalty_programs" DROP CONSTRAINT "FK_4305a2cd678b5dfc644e24ab84c"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP CONSTRAINT "FK_85a7f13b3f434940151fb44f4c1"`);
        await queryRunner.query(`ALTER TABLE "point_transactions" DROP CONSTRAINT "FK_b68493c9762bcc0a65f89316819"`);
        await queryRunner.query(`ALTER TABLE "point_transactions" DROP CONSTRAINT "FK_d7805895b03f54d3d1cf56d72eb"`);
        await queryRunner.query(`ALTER TABLE "members" DROP CONSTRAINT "FK_844f9f34eaefdb094ef9664dc65"`);
        await queryRunner.query(`DROP TABLE "loyalty_programs"`);
        await queryRunner.query(`DROP TABLE "tenant_users"`);
        await queryRunner.query(`DROP TABLE "point_transactions"`);
        await queryRunner.query(`DROP TABLE "members"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP TABLE "apple_device_registrations"`);
    }

}
