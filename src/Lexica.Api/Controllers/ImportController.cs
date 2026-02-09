using System.Security.Claims;
using Lexica.Infrastructure.Services;
using Lexica.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lexica.Api.Controllers;

[ApiController]
[Route("api/words/import")]
[Authorize]
public class ImportController(ExcelImportService importService, ExcelExportService exportService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("preview")]
    public async Task<ActionResult<ImportPreviewResponse>> Preview(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Geen bestand geüpload.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".xlsx" && extension != ".xls")
            return BadRequest("Alleen Excel-bestanden (.xlsx, .xls) zijn toegestaan.");

        using var stream = file.OpenReadStream();
        var result = await importService.Preview(stream, UserId);
        return Ok(result);
    }

    [HttpPost("confirm")]
    public async Task<ActionResult<ImportResultResponse>> Confirm(ImportConfirmRequest request)
    {
        var result = await importService.Confirm(request.SessionId, UserId, request.UpdateDuplicates);
        return Ok(result);
    }

    [HttpGet("template")]
    public IActionResult DownloadTemplate()
    {
        var bytes = exportService.GenerateTemplate();
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "lexica-template.xlsx");
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportWords()
    {
        var bytes = await exportService.ExportWords(UserId);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "lexica-woorden.xlsx");
    }
}
