using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lexica.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileAndSetSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SetSubscriptions_AspNetUsers_UserId",
                table: "SetSubscriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_UserWordProgress_AspNetUsers_UserId",
                table: "UserWordProgress");

            migrationBuilder.CreateTable(
                name: "Groups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Language = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DefaultDirection = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Groups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Groups_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GroupWords",
                columns: table => new
                {
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WordId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupWords", x => new { x.GroupId, x.WordId });
                    table.ForeignKey(
                        name: "FK_GroupWords_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GroupWords_Words_WordId",
                        column: x => x.WordId,
                        principalTable: "Words",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Groups_UserId",
                table: "Groups",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupWords_WordId",
                table: "GroupWords",
                column: "WordId");

            migrationBuilder.AddForeignKey(
                name: "FK_SetSubscriptions_AspNetUsers_UserId",
                table: "SetSubscriptions",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_UserWordProgress_AspNetUsers_UserId",
                table: "UserWordProgress",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SetSubscriptions_AspNetUsers_UserId",
                table: "SetSubscriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_UserWordProgress_AspNetUsers_UserId",
                table: "UserWordProgress");

            migrationBuilder.DropTable(
                name: "GroupWords");

            migrationBuilder.DropTable(
                name: "Groups");

            migrationBuilder.AddForeignKey(
                name: "FK_SetSubscriptions_AspNetUsers_UserId",
                table: "SetSubscriptions",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UserWordProgress_AspNetUsers_UserId",
                table: "UserWordProgress",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
