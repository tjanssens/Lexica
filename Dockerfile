# syntax=docker/dockerfile:1.7

# Stage 1: Build Angular frontend
FROM node:20-alpine AS frontend-build
WORKDIR /src
COPY src/lexica-frontend/package*.json ./
RUN npm ci
COPY src/lexica-frontend/ ./
RUN npm run build -- --configuration production

# Stage 2: Build .NET API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src
COPY Lexica.sln NuGet.config ./
COPY src/Lexica.Api/Lexica.Api.csproj src/Lexica.Api/
COPY src/Lexica.Core/Lexica.Core.csproj src/Lexica.Core/
COPY src/Lexica.Infrastructure/Lexica.Infrastructure.csproj src/Lexica.Infrastructure/
COPY src/Lexica.Shared/Lexica.Shared.csproj src/Lexica.Shared/
RUN dotnet restore src/Lexica.Api/Lexica.Api.csproj
COPY src/Lexica.Api src/Lexica.Api
COPY src/Lexica.Core src/Lexica.Core
COPY src/Lexica.Infrastructure src/Lexica.Infrastructure
COPY src/Lexica.Shared src/Lexica.Shared
RUN dotnet publish src/Lexica.Api/Lexica.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=backend-build /app/publish ./
COPY --from=frontend-build /src/dist/lexica-frontend/browser ./wwwroot
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Lexica.Api.dll"]
