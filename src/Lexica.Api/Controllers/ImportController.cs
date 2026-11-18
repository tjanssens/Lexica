using System.Security.Claims;
using Lexica.Core.Enums;
using Lexica.Infrastructure.Services;
using Lexica.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

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

        try
        {
            using var stream = file.OpenReadStream();
            return Ok(await importService.Preview(stream, UserId));
        }
        catch (InvalidDataException ex) { return BadRequest(ex.Message); }
    }

    // Foto van een woordenlijst -> (term, vertaling)-paren via Claude, voor de algemene woordenlijst
    // (zonder set). De taal kiest de gebruiker. Er wordt nog niets geïmporteerd.
    [HttpPost("photo")]
    [RequestSizeLimit(PhotoImportHandler.MaxRequestBytes)]
    public Task<ActionResult<PhotoImportResponse>> ImportPhoto(
        IFormFile file, [FromQuery] Language language,
        [FromServices] PhotoWordExtractionService photoService,
        [FromServices] IMemoryCache cache,
        CancellationToken ct)
        => PhotoImportHandler.Handle(this, file, language, UserId, photoService, cache, ct);

    // Preview voor nagekeken (term, vertaling)-paren, bv. van een foto, in de gekozen taal.
    [HttpPost("preview-rows")]
    public async Task<ActionResult<ImportPreviewResponse>> PreviewRows(ImportRowsPreviewRequest request)
    {
        if (request?.Rows == null || request.Rows.Count == 0)
            return BadRequest("Geen woorden om te importeren.");
        if (request.Rows.Count > 500)
            return BadRequest("Maximaal 500 woorden per keer.");
        if (!Enum.TryParse<Language>(request.Language, true, out var language))
            return BadRequest("Kies een taal.");

        return Ok(await importService.PreviewRows(request.Rows, UserId, null, language));
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
