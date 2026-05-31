using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lexica.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class PerUserNotificationTimes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NotificationDispatches_JobType_RunDate",
                table: "NotificationDispatches");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "NotificationDispatches",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            // Backfill bestaande gebruikers met de tot nu toe geldende vaste tijdstippen (16:00 / 20:00),
            // zodat ze niet plots een middernacht-melding krijgen.
            migrationBuilder.AddColumn<TimeOnly>(
                name: "DailyReminderTime",
                table: "AspNetUsers",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(16, 0, 0));

            migrationBuilder.AddColumn<TimeOnly>(
                name: "EveningNudgeTime",
                table: "AspNetUsers",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(20, 0, 0));

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDispatches_UserId_JobType_RunDate",
                table: "NotificationDispatches",
                columns: new[] { "UserId", "JobType", "RunDate" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NotificationDispatches_UserId_JobType_RunDate",
                table: "NotificationDispatches");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "NotificationDispatches");

            migrationBuilder.DropColumn(
                name: "DailyReminderTime",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "EveningNudgeTime",
                table: "AspNetUsers");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDispatches_JobType_RunDate",
                table: "NotificationDispatches",
                columns: new[] { "JobType", "RunDate" },
                unique: true);
        }
    }
}
