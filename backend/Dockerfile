# Dockerfile do backend ASP.NET Core (build multi-estágio).
# O contexto de build é a RAIZ do repositório, porque o .csproj embute ../../database/migrations/*.sql.

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore primeiro para aproveitar o cache de camadas.
COPY backend/Backend.Api/Backend.Api.csproj backend/Backend.Api/
COPY database/ database/
RUN dotnet restore backend/Backend.Api/Backend.Api.csproj

COPY backend/ backend/
RUN dotnet publish backend/Backend.Api/Backend.Api.csproj -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /out .
ENV ASPNETCORE_URLS=http://0.0.0.0:8000
EXPOSE 8000
ENTRYPOINT ["dotnet", "Backend.Api.dll"]
