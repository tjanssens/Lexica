using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lexica.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicSetsAndUserProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Add new columns to existing tables
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Sets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublic",
                table: "Sets",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "ReviewLogs",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "DisplayName",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfilePictureUrl",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true);

            // Step 2: Create new tables
            migrationBuilder.CreateTable(
                name: "SetSubscriptions",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubscribedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SetSubscriptions", x => new { x.UserId, x.SetId });
                    table.ForeignKey(
                        name: "FK_SetSubscriptions_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SetSubscriptions_Sets_SetId",
                        column: x => x.SetId,
                        principalTable: "Sets",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserWordProgress",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WordId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Easiness = table.Column<double>(type: "float", nullable: false),
                    Interval = table.Column<int>(type: "int", nullable: false),
                    Repetitions = table.Column<int>(type: "int", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastReviewed = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TimesReviewed = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserWordProgress", x => new { x.UserId, x.WordId });
                    table.ForeignKey(
                        name: "FK_UserWordProgress_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserWordProgress_Words_WordId",
                        column: x => x.WordId,
                        principalTable: "Words",
                        principalColumn: "Id");
                });

            // Step 3: Migrate data from Words to UserWordProgress
            migrationBuilder.Sql(@"
                INSERT INTO UserWordProgress (UserId, WordId, Easiness, [Interval], Repetitions, DueDate, LastReviewed, TimesReviewed, Notes)
                SELECT UserId, Id, Easiness, [Interval], Repetitions, DueDate, LastReviewed, TimesReviewed, Notes
                FROM Words
            ");

            // Step 4: Migrate UserId in ReviewLogs from Word owner
            migrationBuilder.Sql(@"
                UPDATE ReviewLogs
                SET UserId = (SELECT UserId FROM Words WHERE Words.Id = ReviewLogs.WordId)
                WHERE UserId = '00000000-0000-0000-0000-000000000000'
            ");

            // Step 5: Drop old columns from Words
            migrationBuilder.DropColumn(
                name: "DueDate",
                table: "Words");

            migrationBuilder.DropColumn(
                name: "Easiness",
                table: "Words");

            migrationBuilder.DropColumn(
                name: "Interval",
                table: "Words");

            migrationBuilder.DropColumn(
                name: "LastReviewed",
                table: "Words");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Words");

            migrationBuilder.DropColumn(
                name: "Repetitions",
                table: "Words");

            migrationBuilder.DropColumn(
                name: "TimesReviewed",
                table: "Words");

            // Step 6: Create indexes and foreign keys
            migrationBuilder.CreateIndex(
                name: "IX_ReviewLogs_UserId",
                table: "ReviewLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SetSubscriptions_SetId",
                table: "SetSubscriptions",
                column: "SetId");

            migrationBuilder.CreateIndex(
                name: "IX_UserWordProgress_WordId",
                table: "UserWordProgress",
                column: "WordId");

            migrationBuilder.AddForeignKey(
                name: "FK_ReviewLogs_AspNetUsers_UserId",
                table: "ReviewLogs",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReviewLogs_AspNetUsers_UserId",
                table: "ReviewLogs");

            migrationBuilder.DropTable(
                name: "SetSubscriptions");

            migrationBuilder.DropTable(
                name: "UserWordProgress");

            migrationBuilder.DropIndex(
                name: "IX_ReviewLogs_UserId",
                table: "ReviewLogs");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Sets");

            migrationBuilder.DropColumn(
                name: "IsPublic",
                table: "Sets");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "ReviewLogs");

            migrationBuilder.DropColumn(
                name: "DisplayName",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ProfilePictureUrl",
                table: "AspNetUsers");

            migrationBuilder.AddColumn<DateTime>(
                name: "DueDate",
                table: "Words",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<double>(
                name: "Easiness",
                table: "Words",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "Interval",
                table: "Words",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastReviewed",
                table: "Words",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Words",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Repetitions",
                table: "Words",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TimesReviewed",
                table: "Words",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
