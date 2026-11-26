# Estándares de ingeniería de MoneyMap

Cómo se trabaja el código en MoneyMap. Aplica igual al backend, a la app y a la web.

> **Este documento es espejo.** Existe una copia idéntica en `moneymap-app`, en `moneymap-back` y en `moneymap-web`.
> Si cambias una copia, cambias las tres en el mismo momento.
>
> Verificación, desde cualquiera de los tres repos:
>
> ```sh
> tool/check-mirrors.sh
> ```
>
> Sin salida y código de salida 0 = sincronizados. Lo mismo vale para `docs/constitution.md`.

## Qué es cada documento

| Documento | Responde a | Cambia |
|---|---|---|
| `docs/constitution.md` | Qué es innegociable. Los principios de producto y las leyes. | Casi nunca |
| `docs/engineering.md` | Este. Cómo se trabaja el código. | Poco, y de a uno |
| `AGENTS.md` | Cómo se corre y se toca este repositorio en concreto. | Cuando cambia el stack |
| `docs/specs/NNN-nombre/spec.md` | Qué se construye y cómo se acepta. | Antes de programar |

Si algo de este documento contradice la constitución, manda la constitución y se pregunta.

---

## 1. Git y control de versiones

### 1.1 Ramas

**1.1.1** Cada repositorio tiene dos ramas permanentes:

- `main` — lo publicado o desplegado. Solo recibe merges desde `develop`.
- `develop` — el trabajo del día a día. Es lo que se despliega a staging.

> Estado actual: `moneymap-app` y `moneymap-back` ya tienen las dos. `moneymap-web` arranca con las dos desde el primer commit.

**1.1.2** Ninguna rama permanente recibe push directo. Todo entra por pull request.

**1.1.3** Las ramas temporales se nombran `<tipo>/<CLAVE>-<descripcion-corta>`: todo en minúsculas, con guiones.

- `<tipo>`: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`.
- `<CLAVE>`: la del ticket de Jira (`MM-14`). Va **siempre**: es lo que enlaza la rama con el ticket.
- La descripción va en español y **sin tildes ni ñ**: Git las soporta, pero las URLs de GitHub y varios CI se rompen con ellas. No repite el tipo.

```text
feat/MM-14-cuentas-multicuenta
fix/MM-32-moneda-distinta-en-transferencia
chore/MM-12-genera-el-cliente-de-la-api
```

**1.1.4** Las ramas temporales se borran al mergear.

**1.1.5** Una rama no vive más de **3 días hábiles**. Si dura más, el trabajo estaba mal cortado.

### 1.2 Commits

**1.2.1** Formato obligatorio: Conventional Commits con **scope del módulo del código**.

```text
<tipo>(<scope>): <asunto>
```

**1.2.2** `<tipo>`: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`.

**1.2.3** `<scope>` es el módulo o carpeta que se toca, en inglés y en singular:

- App: `app`, `core-api`, `core-money`, `core-l10n`, `auth`, `accounts`, `quick-add`, `map`, `money-flow`, `goals`, `reports`, `notifications`, `voice`.
- Backend: `iam`, `billing`, `finance`, `goals`, `planning`, `reports`, `notify`, `ai`, `ops`, `db`.
- Transversal, en los tres: `docs`, `specs`, `hooks`, `ci`, `deps`.
- Web: `app`, `components`, `api`, `auth`, `money`, `i18n`, `onboarding`, `accounts`, `quick-add`, `map`, `money-flow`, `goals`, `reports`, `notifications`, `voice`.

Cuando un commit toca varias cosas, el scope es el módulo principal del cambio.

**1.2.4** El asunto va en **español**, en minúscula y en imperativo (`agrega`, no `agregado` ni `agregando`), sin punto final y con un máximo de **72 caracteres**. El tipo y el scope quedan en inglés: el tipo es una palabra clave que parsean las herramientas de changelog y de análisis, y el scope es el nombre de la carpeta del código.

```text
feat(finance): agrega el CRUD de cuentas multicuenta
fix(iam): revoca la cadena de sesiones si se reusa un refresh
test(core-money): cubre el formato decimal en es-BO
```

**1.2.5** Prohibidos como asunto: `wip`, `arreglos`, `avances`, `cambios varios`, `fix`, `update`, `asdf`. Un commit sin asunto real no entra, y lo verifica el hook `commit-msg` (§6.10).

**1.2.6** Un commit es un cambio coherente **y que compila**. Prohibido dejar una rama compartida en un estado intermedio roto.

**1.2.7** El cuerpo del commit, si lo hay, explica el **por qué**. El qué ya está en el diff.

**1.2.8** El ticket no se repite en cada commit: va en la rama y en el PR.

### 1.3 Pull requests

**1.3.1** El título lleva la clave del ticket al principio y el mismo formato que un commit:

```text
MM-14 feat(finance): add multicurrency account CRUD
```

**1.3.2** Tamaño máximo: **400 líneas** de diff, sin contar archivos generados ni fixtures. Si pasa, se parte. Un PR de 2.000 líneas no se revisa: se aprueba.

**1.3.3** La descripción responde cuatro cosas:

1. **Qué** cambia.
2. **Por qué**: el ticket y el RF de la spec que cumple.
3. **Cómo se probó**: los comandos exactos y qué se vio.
4. **Qué queda fuera**, si algo quedó fuera a propósito.

**1.3.4** Prohibido mezclar en un PR: funcionalidad nueva + refactor grande, o funcionalidad + reformateo masivo. El refactor va antes, en su propio PR.

**1.3.5** Se corre todo en local **antes** de abrir el PR, no se usa el PR como banco de pruebas.

**1.3.6** El autor no aprueba su propio PR.

### 1.4 Merge

**1.4.1** A `develop` se entra con **squash**: un PR = un commit, con el título del PR como mensaje.

**1.4.2** De `develop` a `main` se entra con **merge commit**, y eso marca la versión.

**1.4.3** Antes de pedir revisión, la rama se **rebasea** sobre `develop`. Nunca se hace `merge develop` hacia dentro de la rama.

**1.4.4** No se mergea una rama desactualizada respecto de `develop`.

**1.4.5** La rama se borra después del merge.

### 1.5 Secretos y archivos prohibidos

**1.5.1** Prohibido commitear: `.env`, `env/dev.json`, llaves, tokens, service accounts, certificados, `.p8`, `.keystore`, `.jks` y volcados de base de datos.

**1.5.2** Los archivos `.example` existen y se actualizan cuando aparece una variable nueva. Un `.example` nunca lleva un valor real.

**1.5.3** Si un secreto se commitea, borrarlo **no alcanza**: hay que rotarlo y avisar. Ya quedó en el historial de todos los clones.

**1.5.4** Prohibido `git add -A` o `git add .` a ciegas. Se revisa `git status` y `git diff` antes de cada commit.

**1.5.5** Los archivos generados nunca se editan a mano: `lib/api/`, `*.g.dart`, `*.freezed.dart` y `openapi.json`. Se regeneran con el comando de cada repositorio, y un PR que cambia un endpoint sin regenerarlos está incompleto.

---

## 2. Testing

**2.1** **Ningún PR se mergea con tests en rojo.** Un test omitido, comentado o con `skip` **cuenta como rojo**.

**2.2** Los tests se escriben **junto con el código, en el mismo PR**. No hay un PR posterior de tests.

**2.3** Todo requisito funcional (RF) de la spec tiene al menos un test, y el nombre del test cita el RF:

```dart
testWidgets('keeps "Crear cuenta" disabled while terms are unchecked (RF-3)', ...);
```

```python
async def test_rejects_underage_registration(...):  # RF-2
```

**2.4** Pirámide y proporción esperada por funcionalidad:

| Capa | Qué cubre | Cuántos |
|---|---|---|
| Unitaria (`test/`, `tests/unit`) | `Money`, formato, reglas de `domain/` y de `application/` | La mayoría |
| Widget (`test/`) | Una pantalla o widget aislado, con providers falsos | Uno por pantalla |
| Integración (`integration_test/`, `tests/integration`) | La app contra una API falsa; la API contra PostgreSQL real | Los flujos con base de datos |
| Punta a punta (`.maestro/`) | El flujo completo en un dispositivo | Solo los flujos principales |

**2.5** La cobertura se exige en la capa de reglas, no en la de pintado:

- App: `lib/core/money/`, `lib/features/*/domain/` y `lib/features/*/data/` → **80 % o más**.
- Backend: `app/modules/*/application/`, `domain/` e `infrastructure/` → **80 % o más**.
- `presentation/` y `router.py`: sin umbral. Se cubren con widget tests y punta a punta.

**2.6** Prohibido en un test: pegarle a la API real, a la base de producción, a Google, a Meta, a FCM o a un proveedor de IA. La integración del backend corre contra PostgreSQL 16 local con las migraciones aplicadas.

**2.7** Determinismo:

- Nada de `DateTime.now()` directo: se inyecta el reloj.
- Nada de `Random()` sin semilla.
- Ningún test depende de otro ni del orden de ejecución.
- Ningún test depende de la red ni de la zona horaria de la máquina.

**2.8** Los golden tests se commitean y **se revisan a mano** cuando cambian. Prohibido regenerar goldens para "arreglar" un fallo: o el cambio era intencional y se aprueba mirando la imagen, o es un bug.

**2.9** Un bug se arregla primero con un test que lo reproduce, y después con el arreglo. El test se queda.

**2.10** Prohibido un test sin aserciones o que solo verifica que no se lanzó una excepción.

---

## 3. Diseño de código

### 3.1 Tamaño

**3.1.1** Un archivo no pasa de **300 líneas**. Al llegar, se parte por responsabilidad.

**3.1.2** Una función o método no pasa de **40 líneas** ni de **4 parámetros**. Más que eso, se extrae o se agrupa en un objeto.

**3.1.3** Excepciones legítimas a 3.1.1: archivos de constantes, catálogos y `schemas.py`. Se justifican en el PR.

**3.1.4** Anidamiento máximo: 3 niveles de `if`/`for`. Más, se usa una guardia o se extrae.

### 3.2 Capas en la app

**3.2.1** La dirección de las dependencias es `presentation → domain → data`. Nunca al revés.

**3.2.2** `presentation/` no importa `dio` ni el cliente generado. Los datos entran por providers que hablan con `domain`.

**3.2.3** `domain/` no importa Flutter ni el cliente de la API: son modelos y reglas puras, testeables sin `WidgetsFlutterBinding`.

**3.2.4** `data/` habla con el cliente generado y traduce a los modelos de `domain/`.

**3.2.5** Cero lógica de negocio en `build()`. Un widget decide cómo se ve, no qué pasa.

**3.2.6** Un `StatefulWidget` solo cuando hay estado local real. Si el padre ya tiene el estado, el hijo no.

### 3.3 Capas en el backend

Cada módulo de `app/modules/<módulo>/` se organiza con CQRS por caso de uso.
El detalle y el porqué están en `docs/adr/001-monolito-modular-cqrs.md` de `moneymap-back`.

**3.3.1** `router.py` → solo HTTP: valida con el esquema, llama al caso de uso, devuelve el esquema. Sin SQL y sin reglas.

**3.3.2** `schemas.py` → Pydantic, nada más: la forma de lo que entra y de lo que sale.

**3.3.3** `application/commands/<verbo>_<sustantivo>.py` → un caso de uso de escritura por requisito funcional. Sin SQL crudo y sin objetos de FastAPI.

**3.3.4** `application/queries/<nombre>.py` → un caso de uso de lectura por consulta. Devuelve un read model, nunca una entidad.

**3.3.5** `domain/` → los read models, los puertos (`Protocol`) y los errores del módulo. No importa FastAPI, SQLAlchemy ni Pydantic.

**3.3.6** `infrastructure/` → el SQL con SQLAlchemy; implementa los puertos de `domain/ports.py`. Sin reglas de negocio.

**3.3.7** La dependencia va `router → application → domain`, e `infrastructure` implementa `domain`. La aplicación nunca importa infraestructura: se cablean en `deps.py`.

**3.3.8** Ningún caso de uso repite una regla que la base ya aplica (constitución §3): traduce el error con `core/errors.py`. El esquema valida solo la forma de lo que entra.

**3.3.9** Toda consulta de un usuario usa la dependencia de sesión por usuario. Prohibido abrir sesiones a mano.

**3.3.10** El dinero se usa desde `app/core/money/`: ningún módulo reimplementa montos, decimales por moneda ni sumas entre monedas.

### 3.4 Reglas transversales

**3.4.1 Regla de tres.** El código se duplica una y dos veces; a la tercera se extrae. Destino: `lib/core/` en la app, `app/core/` o un módulo compartido en el backend.

**3.4.2** Cero números y textos mágicos. Las constantes llevan nombre; los textos de usuario salen siempre de los ARB, nunca escritos en el widget.

**3.4.3** Nada de `print`, `debugPrint` ni `console.log` en código que se mergea. En el backend se usa `ops.log()`.

**3.4.4** Prohibido un `catch` vacío o que solo registra. Todo error se traduce a un `code`, se envuelve en un error del dominio, o se relanza.

**3.4.5** Sin código muerto ni "por si acaso": nada de funciones sin llamadas, parámetros sin uso ni ramas inalcanzables.

**3.4.6** Todo `TODO` lleva un ticket al lado: `// TODO(MM-45): ...`. Sin ticket, no se mergea.

**3.4.7** Los comentarios explican el **por qué** o una restricción que no se ve en el código. Prohibido comentar lo que el código ya dice.

**3.4.8** Una dependencia nueva se agrega solo preguntando (ya aplica), y se evalúa antes su peso, su licencia y si sigue mantenida.

**3.4.9** Sin estado global mutable ni singletons sueltos. En la app, todo pasa por providers de Riverpod.

**3.4.10** Nombres descriptivos y sin abreviaturas adivinables. Prohibidos como nombre de clase: `Data`, `Temp`, `Aux`, `Manager`, `Helper`, `Utils`.

**3.4.11** Una función devuelve un valor o lanza, no ambas. Prohibido usar `null` para mezclar "error" con "vacío".

---

## 4. Proceso y equipo

**4.1 Spec first.** No se abre un PR sin spec. Si el código contradice la spec, **se para y se pregunta**; no se decide dentro del PR.

**4.2** Si la spec está incompleta, se marca `[NECESITA ACLARACIÓN]` y se pregunta. Prohibido adivinar.

**4.3 Review.** Todo PR lo revisa otra persona, con un máximo de **1 día hábil** de espera.

**4.4** Revisión obligatoria por alguien distinto del autor cuando el PR toca: RLS o permisos, migraciones, autenticación o tokens, planes y pagos, o el cálculo de saldos.

**4.5** Quien revisa mira, en este orden: que cumpla el RF de la spec, que los tests prueben lo que dicen probar, el manejo de errores, y las reglas de la sección 3.

**4.6** Prohibido aprobar para no bloquear. Un PR que no se entiende se devuelve.

**4.7** El avance se marca en la spec (los RF cumplidos) y en el ticket **dentro del mismo PR**.

**4.8 ADR.** Las decisiones que no se revierten fácil se anotan en `docs/adr/NNN-titulo.md`: contexto, decisión, alternativa descartada y consecuencia. Hay decisiones ya tomadas que todavía no están escritas: que la versión web es un proyecto aparte en otro stack, que la app nunca convierte monedas, y que la base de datos cuida las reglas del dinero.

**4.9** Un ticket mal estimado se avisa el mismo día, no al cerrar el sprint.

**4.10** Nadie lleva dos tareas a la vez. Se termina una antes de abrir la otra.

---

## 5. Seguridad y datos

**5.1** Prohibido en logs, en analítica (PostHog) y en captura de errores (Sentry): contraseñas, tokens, fechas de nacimiento, números de tarjeta (solo los últimos 4), montos, saldos, historial de transacciones y el audio del dictado.

**5.2** Al LLM solo van la frase del usuario y los nombres de sus categorías, cuentas y monedas.

**5.3** Toda consulta de un usuario corre con RLS activa. Prohibido desactivarla o usar el rol del worker para atender a una persona.

**5.4** Los secretos viven en Secret Manager, nunca en el repositorio ni en un archivo versionado.

**5.5** Los tokens de acceso son cortos y el refresh rota. Un refresh reusado revoca toda la cadena de ese dispositivo.

**5.6** Ninguna respuesta de la API devuelve datos de otro usuario, ni dentro de un mensaje de error.

---

## 6. Operación

**6.1 Entornos.** `dev` (local, docker compose), `staging` (datos falsos) y `prod`. Nadie prueba contra `prod`.

**6.2 Versionado.** La app usa `version` y `build` de `pubspec.yaml`; la API va bajo `/v1`. Un cambio incompatible abre `/v2`; `/v1` nunca se rompe.

**6.3 Migraciones.** Solo hacia adelante. Una migración ya aplicada **nunca se edita**: el cambio va en una migración nueva. Los cambios de esquema van por Alembic, no editando `db/migrations/`.

**6.4** Toda migración se prueba en una base limpia antes del PR: `alembic upgrade head` desde cero, más `db/tests/smoke_test.sql`.

**6.5** Si cambia un endpoint o un esquema, se regenera `openapi.json` y **se avisa a la app en el mismo PR**.

**6.6 Presupuesto de rendimiento.** Los que fija la constitución §8 (API p95 menor a 300 ms; Quick Add en menos de 10 segundos) se verifican antes de cerrar el ticket. Los presupuestos de la app —arranque en frío, tamaño del paquete y fluidez del scroll del Map— todavía **no están fijados**.

**6.7 Observabilidad.** Un error de integración, de seguridad o de un job va a `ops.log()`. El detalle de cada petición va a Cloud Logging con su `request_id`.

**6.8 Rollback.** Un despliegue que rompe se revierte a la versión anterior. No se arregla hacia adelante en caliente.

**6.9 Pendiente.** Hay hooks locales (§6.10), pero **todavía no hay CI**: nada corre en un servidor y nada impide un push con los tests en rojo. Hasta que exista el pipeline, las secciones 1, 2 y 3 dependen de la disciplina y de la revisión. **Es el siguiente paso.**

**6.10 Hooks locales.** Los hooks están versionados en `.githooks/` y su activación es local. Una sola vez por clon:

```bash
git config core.hooksPath .githooks
```

Para desactivarlos: `git config --unset core.hooksPath`.

| Hook | Qué corre |
|---|---|
| `pre-commit` | Formato y lint sobre los archivos en stage, y frena `.env` y las llaves |
| `commit-msg` | Valida el formato del mensaje (§1.2) |
| `pre-push` | Formato, análisis estático y tests |

Un hook **no es un candado**: se saltea con `git commit --no-verify` y `git push --no-verify`. Sirve para no ensuciar el historial ni el remoto, no para reemplazar al CI (§6.9). Por eso el `flutter analyze` y los tests van en `pre-push` y no en `pre-commit`: si cada commit tarda un minuto, la gente se acostumbra a usar `--no-verify` y el hook deja de servir.

En Windows los hooks necesitan `.gitattributes` con `* text=auto eol=lf`. Sin eso Git los baja con CRLF y fallan con `bad interpreter: /bin/sh^M`. Los tres repos ya lo tienen.

**Trampa de Windows, la que más muerde:** Git en Windows registra los archivos nuevos como `100644`, así que un hook commiteado desde Windows **no queda ejecutable** en macOS ni en Linux y no corre para nadie. Al agregarlos, siempre con:

```bash
git add --chmod=+x .githooks
```

Si ya se commiteó mal, se arregla sin tocar el archivo:

```bash
git update-index --chmod=+x .githooks/pre-commit
```

Se verifica con `git ls-files -s .githooks`: tiene que decir `100755`, no `100644`.

---

## 7. Definition of Done

Una funcionalidad está terminada solo cuando se cumple **todo** esto:

- [ ] Existe la spec y los RF que cubre quedaron marcados como cumplidos.
- [ ] Cumple los RF y los casos límite de la spec.
- [ ] Tiene sus tests, y están en verde.
- [ ] App: `dart format --output=none --set-exit-if-changed .` y `flutter analyze` sin problemas.
- [ ] Backend: `uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest` en verde.
- [ ] Si tocó un flujo principal, su flujo de Maestro en verde.
- [ ] Si cambió el contrato de la API, `openapi.json` regenerado y el cliente de la app también.
- [ ] Revisado en tema claro y oscuro, con texto al 200 % y en un teléfono pequeño.
- [ ] El PR fue aprobado por otra persona.
- [ ] La spec y el ticket quedaron actualizados.
- [ ] El ticket quedó cerrado en el board.

Las leyes de este documento que no se negocian están resumidas en `docs/constitution.md` §10.
