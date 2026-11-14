using Lexica.Core.Enums;
using Lexica.Infrastructure.Services;
using Lexica.Shared.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace Lexica.Api.Controllers;

// Gedeelde afhandeling van "foto -> woordjes" voor de import in een set en de algemene import.
// Er wordt niets geïmporteerd: de app toont de herkende rijen eerst ter controle. De foto wordt niet bewaard.
internal static class PhotoImportHandler
{
    // Elke foto kost een (betaalde) Claude-aanroep: per gebruiker beperken we het aantal per dag.
    public const int MaxPhotosPerUserPerDay = 30;

    public const long MaxRequestBytes = PhotoWordExtractionService.MaxImageBytes + 64 * 1024;

    public static async Task<ActionResult<PhotoImportResponse>> Handle(
        ControllerBase controller, IFormFile? file, Language language, Guid userId,
        PhotoWordExtractionService photoService, IMemoryCache cache, CancellationToken ct)
    {
        if (!photoService.IsConfigured)
            return controller.StatusCode(StatusCodes.Status503ServiceUnavailable, "Foto-import is nog niet ingesteld op de server.");
        if (file == null || file.Length == 0)
            return controller.BadRequest("Geen foto geüpload.");
        if (file.Length > PhotoWordExtractionService.MaxImageBytes)
            return controller.BadRequest("De foto is te groot (maximaal 5 MB).");
        var mediaType = file.ContentType?.ToLowerInvariant() ?? "";
        if (!PhotoWordExtractionService.SupportedMediaTypes.Contains(mediaType))
            return controller.BadRequest("Alleen JPG-, PNG-, WebP- of GIF-foto's zijn toegestaan.");

        var quotaKey = $"photo-import:{userId}:{DateTime.UtcNow:yyyy-MM-dd}";
        var used = cache.GetOrCreate(quotaKey, e => { e.AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1); return new int[1]; })!;
        if (Interlocked.Increment(ref used[0]) > MaxPhotosPerUserPerDay)
            return controller.StatusCode(StatusCodes.Status429TooManyRequests, $"Je kunt maximaal {MaxPhotosPerUserPerDay} foto's per dag importeren.");

        byte[] bytes;
        using (var ms = new MemoryStream())
        {
            await file.CopyToAsync(ms, ct);
            bytes = ms.ToArray();
        }

        try
        {
            var rows = await photoService.ExtractWords(bytes, mediaType, language, ct);
            return controller.Ok(new PhotoImportResponse(rows));
        }
        catch (PhotoImportFailedException ex)
        {
            return controller.StatusCode(StatusCodes.Status502BadGateway, ex.Message);
        }
    }
}
