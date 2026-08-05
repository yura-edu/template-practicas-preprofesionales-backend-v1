# Prácticas Preprofesionales — Backend

> API de gestión de prácticas preprofesionales: ofertas, postulaciones, libro de horas y acreditación.

Template oficial de Yura para el dominio **Prácticas Preprofesionales**. API REST en
**NestJS + Prisma + PostgreSQL** con autenticación JWT, cuatro roles y sincronización
offline para registro de horas en campo.

**Problema que resuelve:** las unidades de vinculación llevan las prácticas en hojas de
cálculo y correos. Los estudiantes registran horas en papel, muchas veces sin señal en el
sitio donde practican. Esta API digitaliza el ciclo completo y funciona sin conexión.

## Setup

Requisitos: Node 24+, pnpm 9+, Docker.

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:deploy
pnpm db:seed
pnpm dev
```

La API queda en `http://localhost:3000/api`.

Usuarios del seed (contraseña `yura1234` para todos):

| Rol | Email |
|---|---|
| Coordinador | `coordinador@miyura.com` |
| Tutor | `tutor0@miyura.com` … `tutor7@miyura.com` |
| Estudiante | `estudiante0@miyura.com` … `estudiante199@miyura.com` |

## Architecture

```
src/
├── main.ts              bootstrap NestJS, prefijo /api
├── app.module.ts        módulo raíz
├── common/              filtro de excepciones
├── prisma/              PrismaService global
├── auth/                login JWT, JwtAuthGuard, RolesGuard
├── company/             empresas
├── offer/               ofertas, publicar, cerrar, cupos
├── application/         postulaciones y decisión
├── placement/           plazas, documentos, acreditación
├── hour-log/            libro de horas
├── evaluation/          evaluaciones de tutor y empresa
└── sync/                pull y push para el cliente offline
```

Modelo de datos:

```
User (STUDENT | TUTOR | COMPANY | COORDINATOR)

Company ──< Offer ──< Application >── User(student)
                          │
                          └── Placement ◆ ──< HourLog ◆
                                         ├──< Evaluation ◆
                                         └──< Document ◆
```

Los modelos marcados ◆ son sincronizables offline: llevan `version`, `updatedAt` y
`deletedAt`.

Máquinas de estado:

| Entidad | Transiciones |
|---|---|
| `Application` | `SUBMITTED → INTERVIEW → ACCEPTED \| REJECTED \| WITHDRAWN` |
| `Placement` | `PENDING_DOCS → ACTIVE → COMPLETED \| ABANDONED \| SUSPENDED` |
| `HourLog` | `DRAFT → SUBMITTED → APPROVED \| REJECTED` |

Reglas de negocio que el dominio sostiene:

- Las postulaciones aceptadas de una oferta no superan sus `seats`.
- Un estudiante tiene como máximo un `Placement` en `ACTIVE`.
- Un `Placement` solo pasa a `ACTIVE` con convenio y seguro validados.
- Un `Placement` solo pasa a `COMPLETED` cuando las horas aprobadas alcanzan
  `requiredHours`.
- Solo el tutor asignado aprueba las horas de su placement.

### Sincronización offline

El cliente mantiene una copia local en IndexedDB y reconcilia contra dos endpoints:

- `GET /api/sync/pull?since=<cursor>&limit=200` — devuelve los cambios posteriores al
  checkpoint. Los borrados viajan como tombstones (`deletedAt != null`).
- `POST /api/sync/push` — recibe operaciones del outbox, cada una con su `clientOpId`.

**Resolución de conflictos:** el servidor es la autoridad sobre el estado. Si un `HourLog`
ya pasó a `APPROVED` o `REJECTED`, la edición offline del estudiante se rechaza y se le
muestra. Si ambos lados están en `DRAFT` o `SUBMITTED`, gana el más reciente.

## Onboarding

Si es tu primer día en este proyecto:

1. Levanta el stack y confirma que `GET /api/offers` responde con las ofertas del seed.
2. **Lee `KNOWN_ISSUES.md` completo.** El equipo anterior dejó problemas conocidos
   documentados ahí. No todos están documentados.
3. Lee `BACKLOG.md`: las épicas están ordenadas y cada una indica qué deuda toca pagar antes.
4. Empieza por el Sprint 0: reproduce tres de los issues conocidos y escribe tests de
   caracterización que capturen el comportamiento actual antes de cambiar nada.
5. Toda contribución entra por Pull Request **contra `develop`**, nunca contra `main`, y
   nunca por push directo. Yura evalúa tus PRs automáticamente.

## CI y evaluación

Dos workflows, con propósitos distintos:

- `ci.yml` — corre en cada push. Migra, typechequea, linta, testea con cobertura y
  construye. Publica `coverage/lcov.info`, `eslint-report.json` y el reporte de jscpd como
  artefactos; el grader de Yura los lee para las métricas absolutas del proyecto.
- `yura-quality.yml` — corre en cada PR. Llama al workflow reutilizable de Yura, que hace
  análisis **del diff**: cobertura de las líneas nuevas (`diff-cover`) y hallazgos nuevos de
  seguridad (Semgrep con baseline). Por eso `base_ref` es `develop`: sin esa rama el análisis
  no tiene contra qué comparar y el check queda colgado.
