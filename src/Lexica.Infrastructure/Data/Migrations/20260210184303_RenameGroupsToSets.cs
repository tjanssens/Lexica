using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lexica.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameGroupsToSets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop foreign keys and indexes on GroupWords first
            migrationBuilder.DropForeignKey(
                name: "FK_GroupWords_Groups_GroupId",
                table: "GroupWords");

            migrationBuilder.DropForeignKey(
                name: "FK_GroupWords_Words_WordId",
                table: "GroupWords");

            migrationBuilder.DropPrimaryKey(
                name: "PK_GroupWords",
                table: "GroupWords");

            migrationBuilder.DropIndex(
                name: "IX_GroupWords_WordId",
                table: "GroupWords");

            // Drop foreign keys and indexes on Groups
            migrationBuilder.DropForeignKey(
                name: "FK_Groups_AspNetUsers_UserId",
                table: "Groups");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Groups",
                table: "Groups");

            migrationBuilder.DropIndex(
                name: "IX_Groups_UserId",
                table: "Groups");

            // Rename tables
            migrationBuilder.RenameTable(
                name: "Groups",
                newName: "Sets");

            migrationBuilder.RenameTable(
                name: "GroupWords",
                newName: "SetWords");

            // Rename column GroupId -> SetId in SetWords
            migrationBuilder.RenameColumn(
                name: "GroupId",
                table: "SetWords",
                newName: "SetId");

            // Re-create primary keys
            migrationBuilder.AddPrimaryKey(
                name: "PK_Sets",
                table: "Sets",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_SetWords",
                table: "SetWords",
                columns: new[] { "SetId", "WordId" });

            // Re-create indexes
            migrationBuilder.CreateIndex(
                name: "IX_Sets_UserId",
                table: "Sets",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SetWords_WordId",
                table: "SetWords",
                column: "WordId");

            // Re-create foreign keys
            migrationBuilder.AddForeignKey(
                name: "FK_Sets_AspNetUsers_UserId",
                table: "Sets",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SetWords_Sets_SetId",
                table: "SetWords",
                column: "SetId",
                principalTable: "Sets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SetWords_Words_WordId",
                table: "SetWords",
                column: "WordId",
                principalTable: "Words",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop foreign keys and indexes on SetWords first
            migrationBuilder.DropForeignKey(
                name: "FK_SetWords_Sets_SetId",
                table: "SetWords");

            migrationBuilder.DropForeignKey(
                name: "FK_SetWords_Words_WordId",
                table: "SetWords");

            migrationBuilder.DropPrimaryKey(
                name: "PK_SetWords",
                table: "SetWords");

            migrationBuilder.DropIndex(
                name: "IX_SetWords_WordId",
                table: "SetWords");

            // Drop foreign keys and indexes on Sets
            migrationBuilder.DropForeignKey(
                name: "FK_Sets_AspNetUsers_UserId",
                table: "Sets");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Sets",
                table: "Sets");

            migrationBuilder.DropIndex(
                name: "IX_Sets_UserId",
                table: "Sets");

            // Rename column SetId -> GroupId in SetWords
            migrationBuilder.RenameColumn(
                name: "SetId",
                table: "SetWords",
                newName: "GroupId");

            // Rename tables back
            migrationBuilder.RenameTable(
                name: "Sets",
                newName: "Groups");

            migrationBuilder.RenameTable(
                name: "SetWords",
                newName: "GroupWords");

            // Re-create primary keys
            migrationBuilder.AddPrimaryKey(
                name: "PK_Groups",
                table: "Groups",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_GroupWords",
                table: "GroupWords",
                columns: new[] { "GroupId", "WordId" });

            // Re-create indexes
            migrationBuilder.CreateIndex(
                name: "IX_Groups_UserId",
                table: "Groups",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupWords_WordId",
                table: "GroupWords",
                column: "WordId");

            // Re-create foreign keys
            migrationBuilder.AddForeignKey(
                name: "FK_Groups_AspNetUsers_UserId",
                table: "Groups",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GroupWords_Groups_GroupId",
                table: "GroupWords",
                column: "GroupId",
                principalTable: "Groups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GroupWords_Words_WordId",
                table: "GroupWords",
                column: "WordId",
                principalTable: "Words",
                principalColumn: "Id");
        }
    }
}
