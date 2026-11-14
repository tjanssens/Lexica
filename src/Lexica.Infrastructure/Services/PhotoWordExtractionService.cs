using System.Text.Json;
using Anthropic;
using Anthropic.Models.Beta;
using Anthropic.Models.Beta.Messages;
using Lexica.Core.Enums;
using Lexica.Shared.DTOs;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Lexica.Infrastructure.Services;

public class AnthropicOptions
{
    public const string SectionName = "Anthropic";

    /// <summary>API-sleutel van de Anthropic API. Nooit in appsettings.json committen:
    /// zet hem via env var <c>Anthropic__ApiKey</c> of <c>dotnet user-secrets</c>.</summary>
    public string? ApiKey { get; set; }

    public string Model { get; set; } = "claude-opus-5-5";

    /// <summary>Optioneel, enkel om de API via een proxy of in tests te bereiken.</summary>
    public string? BaseUrl { get; set; }
}

/// <summary>De foto-import is niet beschikbaar omdat er geen API-sleutel ingesteld is.</summary>
public class PhotoImportNotConfiguredException() : Exception("Foto-import is niet ingesteld op de server.");

/// <summary>Claude kon de foto niet verwerken (weigering, onleesbaar antwoord, API-fout).</summary>
public class PhotoImportFailedException(string message, Exception? inner = null) : Exception(message, inner);

// Leest een foto van een woordenlijst (bv. een pagina uit een schoolboek) uit met Claude en geeft
// de (term, vertaling)-paren terug. De foto wordt enkel voor dit verzoek naar Anthropic gestuurd en
// niet door Lexica bewaard. Het resultaat gaat eerst langs een bewerkbaar voorbeeld bij de gebruiker.
public class PhotoWordExtractionService(IOptions<AnthropicOptions> options, ILogger<PhotoWordExtractionService> logger)
{
    public static readonly string[] SupportedMediaTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    // Anthropic weigert afbeeldingen groter dan 5 MB; de app verkleint foto's al vóór het uploaden.
    public const long MaxImageBytes = 5 * 1024 * 1024;

    private static readonly Dictionary<Language, string> LanguageNames = new()
    {
        [Language.Latin] = "Latin",
        [Language.Greek] = "Ancient Greek",
        [Language.English] = "English",
        [Language.French] = "French",
    };

    public bool IsConfigured => !string.IsNullOrWhiteSpace(options.Value.ApiKey);

    public async Task<List<ImportRowInput>> ExtractWords(byte[] image, string mediaType, Language language, CancellationToken ct = default)
    {
        if (!IsConfigured) throw new PhotoImportNotConfiguredException();

        var client = string.IsNullOrWhiteSpace(options.Value.BaseUrl)
            ? new AnthropicClient { ApiKey = options.Value.ApiKey }
            : new AnthropicClient { ApiKey = options.Value.ApiKey, BaseUrl = options.Value.BaseUrl };
        var languageName = LanguageNames.GetValueOrDefault(language, language.ToString());

        var parameters = new MessageCreateParams
        {
            Model = options.Value.Model,
            MaxTokens = 16000,
            // Bij een weigering van de veiligheidsfilters neemt een ander model het verzoek over.
            Betas = [AnthropicBeta.ServerSideFallback2026_07_01],
            Fallbacks = new Default(),
            OutputConfig = new BetaOutputConfig
            {
                Effort = Effort.Medium,
                Format = new BetaJsonOutputFormat { Schema = ResultSchema },
            },
            System = BuildSystemPrompt(languageName),
            Messages =
            [
                new BetaUserMessageParam
                {
                    Content = new List<BetaContentBlockParam>
                    {
                        new BetaImageBlockParam
                        {
                            Source = new BetaBase64ImageSource
                            {
                                Data = Convert.ToBase64String(image),
                                MediaType = mediaType,
                            },
                        },
                        new BetaTextBlockParam { Text = $"Extract every {languageName} word and its Dutch translation from this word list." },
                    },
                },
            ],
        };

        BetaMessage response;
        try
        {
            response = await client.Beta.Messages.Create(parameters, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Anthropic API-fout bij foto-import");
            throw new PhotoImportFailedException("De foto kon niet verwerkt worden. Probeer het later opnieuw.", ex);
        }

        if (response.StopReason == "refusal")
            throw new PhotoImportFailedException("Deze foto kon niet verwerkt worden.");
        if (response.StopReason == "max_tokens")
            throw new PhotoImportFailedException("De woordenlijst is te lang voor één foto. Fotografeer een kleiner stuk.");

        var json = string.Concat(response.Content
            .Select(b => b.Value)
            .OfType<BetaTextBlock>()
            .Select(t => t.Text));

        try
        {
            var result = JsonSerializer.Deserialize<ExtractionResult>(json, JsonOptions);
            return (result?.Words ?? [])
                .Select(w => new ImportRowInput(w.Term?.Trim(), w.Translation?.Trim()))
                .Where(w => !string.IsNullOrEmpty(w.Term) || !string.IsNullOrEmpty(w.Translation))
                .ToList();
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Onleesbaar antwoord van Claude bij foto-import");
            throw new PhotoImportFailedException("De foto kon niet verwerkt worden. Probeer het opnieuw.", ex);
        }
    }

    private static string BuildSystemPrompt(string languageName) => $"""
        You read photos of vocabulary lists for a Dutch-speaking student learning {languageName}.
        The photo usually shows a page from a schoolbook, a worksheet or handwritten notes, with
        {languageName} terms and their Dutch translations, often in two columns.

        Return every vocabulary entry on the page, in reading order (top to bottom; when the page
        has several lists side by side, finish the left list before the right one).
        - term: the {languageName} entry exactly as printed, including the forms that belong to it
          (e.g. "amo, amare, amavi, amatum", "servus, -i m.", "magnus, -a, -um"). Keep accents,
          breathings and capitalisation. Leave out list numbering.
        - translation: the Dutch translation as printed. Keep several meanings in one string,
          separated the way the page separates them.
        If the Dutch column is on the left, still put the {languageName} word in term.
        Skip titles, headers, page numbers, example sentences and grammar explanations.
        If an entry has no visible translation, return it with an empty translation.
        Do not invent or correct words; copy what is on the page. Return an empty list if the
        photo contains no word list.
        """;

    private static readonly Dictionary<string, JsonElement> ResultSchema = new()
    {
        ["type"] = JsonSerializer.SerializeToElement("object"),
        ["properties"] = JsonSerializer.SerializeToElement(new
        {
            words = new
            {
                type = "array",
                items = new
                {
                    type = "object",
                    properties = new
                    {
                        term = new { type = "string" },
                        translation = new { type = "string" },
                    },
                    required = new[] { "term", "translation" },
                    additionalProperties = false,
                },
            },
        }),
        ["required"] = JsonSerializer.SerializeToElement(new[] { "words" }),
        ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
    };

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private sealed record ExtractionResult(List<ExtractedWord>? Words);
    private sealed record ExtractedWord(string? Term, string? Translation);
}
