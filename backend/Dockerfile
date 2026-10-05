FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /app

COPY Backend.Api/Backend.Api.csproj Backend.Api/

RUN dotnet restore Backend.Api/Backend.Api.csproj

COPY . .

WORKDIR /app/Backend.Api

EXPOSE 8000

CMD ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:8000"]