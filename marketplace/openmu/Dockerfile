# OpenMU with the marketplace escrow plugin. Same stages as upstream's
# src/Startup/Dockerfile; the only difference is where the source comes from
# (a pinned upstream commit) and the seven files copied over it.
#
#   docker build -t openmu-escrow marketplace/openmu

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS base
WORKDIR /app

RUN apk add --no-cache icu-libs
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

EXPOSE 8080
EXPOSE 55901
EXPOSE 55902
EXPOSE 55903
EXPOSE 55904
EXPOSE 55905
EXPOSE 55906
EXPOSE 44405
EXPOSE 55980

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
ARG OPENMU_COMMIT=15c2705d1b35baa07b758cea2d4f7d6da09145e5
RUN apk add --no-cache git
WORKDIR /openmu
RUN git init -q . \
    && git remote add origin https://github.com/MUnique/OpenMU.git \
    && git fetch -q --depth 1 origin ${OPENMU_COMMIT} \
    && git checkout -q FETCH_HEAD

WORKDIR /openmu/src
COPY src/ ./

RUN dotnet restore "Startup/MUnique.OpenMU.Startup.csproj"

WORKDIR /openmu/src/Startup

RUN dotnet build "MUnique.OpenMU.Startup.csproj" \
    -c Release \
    -o /app/build \
    -p:ci=true

FROM build AS publish
RUN dotnet publish "MUnique.OpenMU.Startup.csproj" \
    -c Release \
    -o /app/publish \
    -p:ci=true

FROM base AS final
WORKDIR /app

COPY --from=publish /app/publish .

RUN mkdir -p /app/logs /app/data-protection-keys && chmod 777 /app/logs /app/data-protection-keys

ARG APP_UID=1000
USER ${APP_UID}

ENTRYPOINT ["dotnet", "MUnique.OpenMU.Startup.dll", "-autostart"]
