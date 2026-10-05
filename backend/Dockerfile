# Dockerfile de DESENVOLVIMENTO para o backend ASP.NET Core
FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /app

# Copia o .csproj primeiro para cache de restore mais eficiente
COPY Backend.Api/Backend.Api.csproj Backend.Api/
RUN dotnet restore Backend.Api/Backend.Api.csproj

COPY . .

EXPOSE 8000

CMD ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:8000", "--project", "Backend.Api"]
