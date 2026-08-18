# Backend Roadmap — Sistema de Inventario

## Phase 0: Project Scaffolding

### Packages & Dependencies
- [ ] Create `packages/shared/` package with its own `package.json` and `tsconfig.json`
- [ ] Set up shared package barrel exports (`index.ts`)
- [ ] Install backend dependencies:
  - [x] `elysia` — HTTP framework (includes TypeBox for schemas)
  - [x] `@elysiajs/cors` — CORS plugin
  - [x] `nodemailer` or `resend` — email sending
  - [x] `bcrypt` — password hashing (used in `PasswordHasher` implementation, NOT in domain)
  - [x] `jsonwebtoken` — JWT auth
- [ ] Add backend npm scripts: `dev`, `build`, `start`, `db:migrate`, `db:seed`
- [ ] Set up `.env` / `.env.example` with DB connection string, JWT secret, SMTP credentials, `BOSS_EMAIL`

### Database (bun:sql)
- [ ] Use `bun:sql` (built-in Bun SQL driver) — no ORM
- [ ] Choose DB: PostgreSQL (recommended) or SQLite for dev simplicity
- [ ] Create `packages/backend/src/infrastructure/database/index.ts`:
  - [ ] Instantiate `SQL` from `bun:sql` with connection string from env
  - [ ] Export the `sql` instance
- [ ] Create raw SQL migration files in `packages/backend/migrations/`:
  - [ ] `001_create_locations.sql`
  - [ ] `002_create_users.sql` (includes `role` column)
  - [ ] `003_create_products.sql`
  - [ ] `004_create_history.sql`
- [ ] Create a simple migration runner script (`db:migrate`) that reads and executes `.sql` files in order
- [ ] Create seed script (`db:seed`) with sample locations and an admin user (role = `ADMIN`)

### SQL Schema (for reference — actual CREATE TABLE in migrations)

```
locations:    id UUID PRIMARY KEY, name VARCHAR(100) NOT NULL
users:        id UUID PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL DEFAULT 'USER', location_id UUID REFERENCES locations(id), created_at TIMESTAMP DEFAULT NOW()
products:     id UUID PRIMARY KEY, name VARCHAR(200) NOT NULL, stock INTEGER NOT NULL DEFAULT 0, location_id UUID REFERENCES locations(id) NULL, created_at TIMESTAMP DEFAULT NOW()
history:      id UUID PRIMARY KEY, user_id UUID REFERENCES users(id), action VARCHAR(50) NOT NULL, product_id UUID REFERENCES products(id), quantity INTEGER, description VARCHAR(500), created_at TIMESTAMP DEFAULT NOW()
```

### Project Structure (Vertical Slicing)
```
packages/backend/src/
├── index.ts                          # Entry point — boots Elysia server
├── infrastructure/
│   ├── database/
│   │   └── index.ts                  # bun:sql connection instance
│   ├── email/
│   │   └── nodemailer-email.service.ts
│   ├── auth/
│   │   └── jwt-auth.service.ts
│   ├── event-bus/
│   │   └── in-memory-event-bus.ts    # Or import from shared
│   └── dependencies.ts               # Composition root
├── modules/
│   ├── users/
│   │   ├── domain/
│   │   │   ├── user.entity.ts
│   │   │   ├── user.repository.ts    # Interface (port)
│   │   │   └── value-objects.ts       # UserId, UserName, UserRole, etc.
│   │   ├── application/
│   │   │   ├── dtos.ts                  # RegisterUserDTO, LoginDTO, UserResponseDTO
│   │   │   ├── register-user.use-case.ts
│   │   │   ├── login.use-case.ts
│   │   │   └── get-all-users.use-case.ts
│   │   └── infra/
│   │       ├── user.routes.ts           # Elysia route group + TypeBox schemas
│   │       └── sql-user.repository.ts   # Implementation (adapter)
│   ├── products/
│   │   ├── domain/
│   │   │   ├── product.entity.ts
│   │   │   ├── product.repository.ts  # Interface (port)
│   │   │   └── value-objects.ts       # ProductId, ProductName, ProductStock, etc.
│   │   ├── application/
│   │   │   ├── dtos.ts                  # CreateProductDTO, ProductResponseDTO, etc.
│   │   │   ├── create-product.use-case.ts
│   │   │   ├── register-stock-entry.use-case.ts
│   │   │   ├── register-stock-exit.use-case.ts
│   │   │   ├── get-product.use-case.ts
│   │   │   ├── get-all-products.use-case.ts
│   │   │   └── get-products-by-location.use-case.ts
│   │   └── infra/
│   │       ├── product.routes.ts
│   │       └── sql-product.repository.ts
│   ├── locations/
│   │   ├── domain/
│   │   │   ├── location.entity.ts
│   │   │   ├── location.repository.ts # Interface (port)
│   │   │   └── value-objects.ts
│   │   ├── application/
│   │   │   └── get-locations.use-case.ts
│   │   └── infra/
│   │       └── location.routes.ts
│   ├── history/
│   │   ├── domain/
│   │   │   ├── history-record.entity.ts
│   │   │   ├── history.repository.ts  # Interface (port)
│   │   │   └── value-objects.ts
│   │   ├── application/
│   │   │   ├── dtos.ts                     # GetHistoryDTO, HistoryRecordResponseDTO
│   │   │   └── get-history.use-case.ts
│   │   └── infra/
│   │       └── sql-history.repository.ts
│   └── notifications/                # Cross-cutting: event listeners
│       ├── product-created.listener.ts
│       ├── stock-change.listener.ts
│       └── stock-low.listener.ts
└── shared/                           # Or import from packages/shared
```

---

## Phase 1: Shared Module (`packages/shared`)

### Value Objects
- [ ] `ValueObject<T>` — abstract class with:
  - [ ] Protected constructor receiving the primitive value
  - [ ] `readonly value: T` public getter
  - [ ] Abstract static `create(...)` — validates and returns `ValueObject<T>` (or throws)
  - [ ] Abstract static `restore(primitive)` — no validation, returns directly
  - [ ] `equals(other: ValueObject<T>)` — structural equality
- [ ] `ID` — abstract class extending `ValueObject<string>`:
  - [ ] Static `generate()` — returns new ID (use `crypto.randomUUID()`)
  - [ ] `create()` calls `generate()` internally (ID is always auto-generated)
  - [ ] `restore(raw: string)` — wraps existing ID string

### Domain Events
- [ ] `DomainEvent` — abstract class:
  - [ ] `readonly eventType: string`
  - [ ] `readonly timestamp: Date`
  - [ ] `readonly payload: Record<string, unknown>`
- [ ] `EventBus` — interface:
  - [ ] `publish(event: DomainEvent): void`
  - [ ] `subscribe(eventType: string, handler: (event: DomainEvent) => void): void`
- [ ] `InMemoryEventBus` — implementation:
  - [ ] Internal `Map<string, Array<handler>>`
  - [ ] `publish` iterates and calls matching handlers
  - [ ] `subscribe` pushes handler to array for that event type

### Errors
- [ ] `ErrorType` enum — `VALIDATION`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `INTERNAL`
- [ ] `DomainError` — abstract class:
  - [ ] `readonly type: ErrorType`
  - [ ] `readonly message: string`
- [ ] Concrete errors extending `DomainError` on each module:

### Interfaces (Ports for infrastructure services)
- [ ] `PasswordHasher` — interface:
  - [ ] `hash(plain: Password): Promise<HashedPassword>`
  - [ ] `compare(plain: Password, hashed: HashedPassword): Promise<boolean>`
- [ ] `EmailService` — interface:
  - [ ] `send(email: Email): Promise<void>`
  - [ ] `Email` type: `{ subject: string; body: string }` (destinatary will always be the same)
- [ ] `TokenManager` — interface:
  - [ ] `generateToken(payload: { userId: UserId }): AuthToken` 
  - [ ] `verifyToken(token: string): UserId | null`

### Barrel exports
- [ ] Export all shared classes/interfaces from `packages/shared/index.ts`

---

## Phase 2: Domain Layer (per module)

### Module: Users — Domain

#### Value Objects
- [ ] `UserId extends ID`
- [ ] `UserName extends ValueObject<string>` — `create` validates: non-empty, max 100 chars
- [ ] `Password extends ValueObject<string>` — `create` validates: min 8 chars (plain text, used for validation before hashing)
- [ ] `HashedPassword extends ValueObject<string>` — `create` wraps a hash string (no validation), `restore` same
- [ ] `UserRole extends ValueObject<string>` — `create` validates: one of `'USER'` or `'ADMIN'`
- [ ] `LocationId extends ID` (shared, also used by products)
- [ ] `CreatedAt extends ValueObject<Date>`

#### Entity: User
- [ ] Fields (private): `_id: UserId`, `_name: UserName`, `_password: HashedPassword`, `_role: UserRole`, `_locationId: LocationId`, `_createdAt: CreatedAt`
- [ ] Private constructor
- [ ] `create(name, hashedPassword, role, locationId)` — receives already-hashed password
  - [ ] Flow: use case receives plain password → validates via `Password.create(plain)` → hashes via `PasswordHasher.hash(plain)` → creates `HashedPassword` VO → calls `User.create(name, hashedPassword, role, locationId)`
- [ ] `restore(id, name, hashedPassword, role, locationId, createdAt)` — no validation
- [ ] Getters returning primitives: `get id()`, `get name()`, `get locationId()`, `get role()`, `get createdAt()`
- [ ] `get passwordHash(): string` — returns the hash (for login verification)
- [ ] `isAdmin(): boolean` — returns `this.role.value === 'ADMIN'`
- [ ] `toJSON()` — serializable object (no password hash)

#### Repository Port
- [ ] `UserRepository` interface:
  - [ ] `findById(id: UserId): Promise<User | null>`
  - [ ] `findByName(name: UserName): Promise<User | null>`
  - [ ] `save(user: User): Promise<void>`

#### Domain Events
- [ ] `UserRegisteredEvent` — payload: `{ userId, userName, role, locationId }`

### Module: Products — Domain

#### Value Objects
- [ ] `ProductId extends ID`
- [ ] `ProductName extends ValueObject<string>` — `create` validates: non-empty, max 200 chars
- [ ] `ProductStock extends ValueObject<number>` — `create` validates: integer; can be negative (per business rules)
  - [ ] `isLow(): boolean` — returns `this.value <= 1`
  - [ ] `add(quantity: number): ProductStock` — returns new `ProductStock` with increased value
  - [ ] `remove(quantity: number): ProductStock` — returns new `ProductStock` with decreased value
- [ ] `Description extends ValueObject<string>` — optional, max 500 chars
- [ ] `LocationId extends ID` (imported from shared or users module)

#### Entity: Product
- [ ] Fields (private): `id: ProductId`, `name: ProductName`, `stock: ProductStock`, `locationId: LocationId | null`, `createdAt: CreatedAt`
- [ ] `locationId` is `null` for global products, a `LocationId` for local products
- [ ] `create(name, stock, locationId?)` — validates, generates ID
- [ ] `restore(id, name, stock, locationId, createdAt)` — no validation
- [ ] Getters: `getId()`, `getName()`, `getStock()`, `getLocationId()`, `getCreatedAt()`
- [ ] `addStock(quantity: StockQuantity)` — replaces internal stock with `stock.add(quantity.value)`
- [ ] `removeStock(quantity: StockQuantity)` — replaces internal stock with `stock.remove(quantity.value)`
- [ ] `hasLowStock(): boolean` — delegates to `this.stock.isLow()`
- [ ] `toJSON()`

#### Repository Port
- [ ] `ProductRepository` interface:
  - [ ] `findById(id: ProductId): Promise<Product | null>`
  - [ ] `findByName(name: ProductName): Promise<Product | null>`
  - [ ] `findByLocation(locationId: LocationId): Promise<Product[]>`
  - [ ] `findGlobal(): Promise<Product[]>`
  - [ ] `save(product: Product): Promise<void>`
  - [ ] `update(product: Product): Promise<void>`
  - [ ] `findAll(): Promise<Product[]>`

#### Domain Events
- [ ] `ProductCreatedEvent` — payload: `{ productId, productName, locationId, createdBy }`
- [ ] `StockEntryRegisteredEvent` — payload: `{ productId, quantity, description, userId }`
- [ ] `StockExitRegisteredEvent` — payload: `{ productId, quantity, description, userId }`
- [ ] `StockLowEvent` — payload: `{ productId, productName, currentStock }`

### Module: Locations — Domain

#### Value Objects
- [ ] `LocationId extends ID` (shared)
- [ ] `LocationName extends ValueObject<string>` — validates: non-empty

#### Entity: Location
- [ ] Fields: `id: LocationId`, `name: LocationName`
- [ ] `create(name)`, `restore(id, name)`
- [ ] Getters: `getId()`, `getName()`

#### Repository Port
- [ ] `LocationRepository` interface:
  - [ ] `findById(id: LocationId): Promise<Location | null>`
  - [ ] `findAll(): Promise<Location[]>`

### Module: History — Domain

#### Value Objects
- [ ] `HistoryId extends ID`
- [ ] `Action extends ValueObject<string>` — validates: one of `'CREATE'`, `'ENTRY'`, `'EXIT'`, `'DELETE'`

#### Entity: HistoryRecord
- [ ] Fields: `id: HistoryId`, `userId: UserId`, `action: Action`, `productId: ProductId`, `quantity: StockQuantity | null`, `description: Description`, `createdAt: CreatedAt`
- [ ] `create(userId, action, productId, quantity?, description?)`, `restore(...)`

#### Repository Port
- [ ] `HistoryRepository` interface:
  - [ ] `save(record: HistoryRecord): Promise<void>`
  - [ ] `findByUser(userId: UserId): Promise<HistoryRecord[]>`

---

## Phase 3: Application Layer (per module)

### Module: Users — Application

#### DTOs (plain TS types)
- [ ] `RegisterUserDTO` — `{ name: string; password: string; role: 'USER' | 'ADMIN'; locationId: string }`
- [ ] `LoginDTO` — `{ name: string; password: string }`
- [ ] `UserResponseDTO` — `{ id: string; name: string; role: string; locationId: string; createdAt: string }`

#### Use Cases
- [ ] `RegisterUserUseCase`:
  - [ ] Receives `RegisterUserDTO`
  - [ ] Validates name uniqueness via `UserRepository.findByName`
  - [ ] Validates plain password via `Password.create(plainPassword)`
  - [ ] Hashes password via `PasswordHasher.hash(plainPassword)`
  - [ ] Creates `HashedPassword` value object from the hash
  - [ ] Creates `UserRole` value object from the role string
  - [ ] Creates User entity via `User.create(name, hashedPassword, role, locationId)`
  - [ ] Saves via `UserRepository.save`
  - [ ] Publishes `UserRegisteredEvent` via EventBus
  - [ ] Returns `UserResponseDTO` (no password)
- [ ] `LoginUseCase`:
  - [ ] Receives `LoginDTO`
  - [ ] Finds user by name via `UserRepository.findByName`
  - [ ] Verifies password via `PasswordHasher.compare(plain, user.getPasswordHash())`
  - [ ] Returns JWT token via `TokenManager.generateToken({ userId })`
- [ ] `GetAllUsersUseCase`:
  - [ ] Returns all users via `UserRepository.findAll`

#### Event Listeners
- [ ] `SendEmailOnUserRegisteredListener`:
  - [ ] Listens to `UserRegisteredEvent`
  - [ ] Sends email to `bossEmail`: "New user registered: {name} at location {locationId}"

### Module: Products — Application

#### DTOs (plain TS types)
- [ ] `CreateProductDTO` — `{ name: string; stock: number; locationId?: string }`
- [ ] `RegisterStockEntryDTO` — `{ quantity: number; description?: string }`
- [ ] `RegisterStockExitDTO` — `{ quantity: number; description?: string }`
- [ ] `ProductResponseDTO` — `{ id: string; name: string; stock: number; locationId: string | null; createdAt: string }`

#### Use Cases
- [ ] `CreateProductUseCase`:
  - [ ] Receives `CreateProductDTO`
  - [ ] Validates name uniqueness via `ProductRepository.findByName`
  - [ ] Creates Product entity via `Product.create(name, stock, locationId)`
  - [ ] Saves via `ProductRepository.save`
  - [ ] Publishes `ProductCreatedEvent` via EventBus
  - [ ] Returns product DTO
- [ ] `RegisterStockEntryUseCase`:
  - [ ] Receives `{ productId, quantity, description }`
  - [ ] Finds product by ID via `ProductRepository.findById`
  - [ ] Creates `StockQuantity` value object from quantity
  - [ ] Calls `product.addStock(quantity)` — product updates its own `ProductStock`
  - [ ] Updates product via `ProductRepository.update`
  - [ ] Saves history via `HistoryRepository.save`
  - [ ] Publishes `StockEntryRegisteredEvent` via EventBus
  - [ ] If `product.isLow()`, publishes `StockLowEvent`
  - [ ] Returns updated product DTO
- [ ] `RegisterStockExitUseCase`:
  - [ ] Same flow as entry but calls `product.removeStock(quantity)`
  - [ ] Stock can go negative (no floor validation)
  - [ ] Publishes `StockExitRegisteredEvent`
- [ ] `GetProductUseCase`:
  - [ ] Finds product by ID, throws NotFoundError if missing
- [ ] `GetAllProductsUseCase`:
  - [ ] Returns all products
- [ ] `GetProductsByLocationUseCase`:
  - [ ] Takes `locationId`, returns products for that location

### Module: Locations — Application

#### Use Cases
- [ ] `GetLocationsUseCase`:
  - [ ] Returns all locations via `LocationRepository.findAll`
  - [ ] Public endpoint (needed for registration form dropdown)

### Module: History — Application

#### DTOs (plain TS types)
- [ ] `GetHistoryDTO` — `{ userId?: string }`
- [ ] `HistoryRecordResponseDTO` — `{ id: string; userId: string; action: string; productId: string; quantity: number | null; description: string | null; createdAt: string }`

#### Use Cases
- [ ] `GetHistoryUseCase`:
  - [ ] If `userId` provided, returns history for that user
  - [ ] Otherwise returns all history
  - [ ] Returns history records as DTOs

### Module: Notifications — Application (Event Listeners)

All listeners receive `EmailService` and `bossEmail: string` (from env) via constructor.

- [ ] `SendEmailOnProductCreatedListener`:
  - [ ] Listens to `ProductCreatedEvent`
  - [ ] Sends email to `bossEmail`: "New product created: {name}"
- [ ] `SendEmailOnStockChangeEventListener`:
  - [ ] Listens to `StockEntryRegisteredEvent` / `StockExitRegisteredEvent`
  - [ ] Sends email to `bossEmail` with entry/exit details
- [ ] `SendEmailOnStockLowListener`:
  - [ ] Listens to `StockLowEvent`
  - [ ] Sends urgent email to `bossEmail`: "Stock low for product {name}: {quantity} remaining"

---

## Phase 4: Infrastructure Layer

### Database Repositories (bun:sql — raw SQL, no ORM)

All repositories follow the same pattern:
- [ ] Import `sql` from `../database/index.ts`
- [ ] Accept `sql` instance in constructor (or receive via DI)
- [ ] Write raw SQL queries using `sql` template literals
- [ ] Map DB rows to domain entities using `restore` factory method
- [ ] Extract primitives from entities when inserting/updating

#### SQL User Repository
- [ ] `SqlUserRepository implements UserRepository`:
  - [ ] `findById`: `SELECT * FROM users WHERE id = ${id}`
  - [ ] `findByName`: `SELECT * FROM users WHERE name = ${name}`
  - [ ] `save`: `INSERT INTO users (id, name, password_hash, role, location_id, created_at) VALUES (...)`
  - [ ] `findAll`: `SELECT * FROM users`
  - [ ] Row → Entity mapping: use `User.restore(row.id, row.name, row.password_hash, row.role, row.location_id, row.created_at)`

#### SQL Product Repository
- [ ] `SqlProductRepository implements ProductRepository`:
  - [ ] `findById`: `SELECT * FROM products WHERE id = ${id}`
  - [ ] `findByName`: `SELECT * FROM products WHERE name = ${name}`
  - [ ] `findByLocation`: `SELECT * FROM products WHERE location_id = ${locationId}`
  - [ ] `findGlobal`: `SELECT * FROM products WHERE location_id IS NULL`
  - [ ] `save`: `INSERT INTO products (...)`
  - [ ] `update`: `UPDATE products SET stock = ${stock} WHERE id = ${id}`
  - [ ] `findAll`: `SELECT * FROM products`

#### SQL Location Repository
- [ ] `SqlLocationRepository implements LocationRepository`:
  - [ ] `findById`, `findAll`

#### SQL History Repository
- [ ] `SqlHistoryRepository implements HistoryRepository`:
  - [ ] `save`, `findByUser`, `findByProduct`, `findAll`

### Infrastructure Services

#### Password Hasher (bcrypt)
- [ ] `BcryptPasswordHasher implements PasswordHasher`:
  - [ ] `hash(plain)`: calls `bcrypt.hash(plain, 10)`
  - [ ] `compare(plain, hashed)`: calls `bcrypt.compare(plain, hashed)`

#### JWT Auth Service
- [ ] `JwtAuthService implements AuthService`:
  - [ ] `generateToken(payload)`: calls `jsonwebtoken.sign(payload, JWT_SECRET, { expiresIn: '24h' })`
  - [ ] `verifyToken(token)`: calls `jsonwebtoken.verify(token, JWT_SECRET)`, returns payload or null

#### Email Service
- [ ] `NodemailerEmailService implements EmailService`:
  - [ ] Creates nodemailer transporter from env config
  - [ ] `send(to, subject, body)`: calls `transporter.sendMail(...)`

### Elysia HTTP Server & Routes

#### Per-Module Route Groups
- [ ] Each module defines its own Elysia route group (`.route()` or `.group()`)
- [ ] Routes define TypeBox schemas for request/response validation (built into Elysia)
- [ ] Route handlers validate against schemas, map to application DTOs, then call use cases

#### TypeBox Schemas (per module, defined in infra layer)
- [ ] Users module schemas:
  - [ ] `RegisterUserSchema` — `Type.Object({ name: Type.String(), password: Type.String({ minLength: 8 }), role: Type.Union([Type.Literal('USER'), Type.Literal('ADMIN')]), locationId: Type.String({ format: 'uuid' }) })`
  - [ ] `LoginSchema` — `Type.Object({ name: Type.String(), password: Type.String() })`
  - [ ] `UserResponseSchema` — `Type.Object({ id, name, role, locationId, createdAt })`
- [ ] Products module schemas:
  - [ ] `CreateProductSchema` — `Type.Object({ name: Type.String(), stock: Type.Integer(), locationId: Type.Optional(Type.String({ format: 'uuid' })) })`
  - [ ] `RegisterStockEntrySchema` — `Type.Object({ quantity: Type.Integer({ minimum: 1 }), description: Type.Optional(Type.String()) })`
  - [ ] `RegisterStockExitSchema` — `Type.Object({ quantity: Type.Integer({ minimum: 1 }), description: Type.Optional(Type.String()) })`
  - [ ] `ProductResponseSchema`
- [ ] History module schemas:
  - [ ] `GetHistorySchema` — `Type.Object({ userId: Type.Optional(Type.String({ format: 'uuid' })) })`
  - [ ] `HistoryRecordResponseSchema`

##### Users Routes (`/api/auth` + `/api/users`)
- [ ] `POST /api/auth/register`:
  - [ ] Body schema: `RegisterUserSchema`
  - [ ] Handler: maps validated body → `RegisterUserDTO`, calls `RegisterUserUseCase`, returns `UserResponseDTO`
- [ ] `POST /api/auth/login`:
  - [ ] Body schema: `LoginSchema`
  - [ ] Handler: maps validated body → `LoginDTO`, calls `LoginUseCase`, returns `{ token }`
- [ ] `GET /api/users` (auth + admin required):
  - [ ] Handler: calls `GetAllUsersUseCase`

##### Products Routes (`/api/products`)
- [ ] `POST /api/products` (auth required):
  - [ ] Body schema: `CreateProductSchema`
  - [ ] Handler: maps validated body → `CreateProductDTO`, calls `CreateProductUseCase`
- [ ] `GET /api/products` (auth required):
  - [ ] Handler: calls `GetAllProductsUseCase`
- [ ] `GET /api/products/:id` (auth required):
  - [ ] Params: `{ id: string }`
  - [ ] Handler: calls `GetProductUseCase`
- [ ] `GET /api/products/location/:locationId` (auth required):
  - [ ] Handler: calls `GetProductsByLocationUseCase`
- [ ] `POST /api/products/:id/entry` (auth required):
  - [ ] Body schema: `RegisterStockEntrySchema`
  - [ ] Handler: maps validated body → `RegisterStockEntryDTO`, calls `RegisterStockEntryUseCase`
- [ ] `POST /api/products/:id/exit` (auth required):
  - [ ] Body schema: `RegisterStockExitSchema`
  - [ ] Handler: maps validated body → `RegisterStockExitDTO`, calls `RegisterStockExitUseCase`

##### Locations Routes (`/api/locations`)
- [ ] `GET /api/locations` (public):
  - [ ] Handler: calls `GetLocationsUseCase`

##### History Routes (`/api/history`)
- [ ] `GET /api/history` (auth required):
  - [ ] Query params: `{ userId?: string }`
  - [ ] If regular user: only returns their own history
  - [ ] If admin: returns all history, or filtered by `userId` if provided

### Middleware
- [ ] `authMiddleware` — Elysia derived macro or `onBeforeHandle`:
  - [ ] Extracts `Authorization: Bearer <token>` header
  - [ ] Calls `AuthService.verifyToken(token)`
  - [ ] If invalid/missing → return 401
  - [ ] If valid → sets `userId` on request context (Elysia's `set`)
  - [ ] Applied to all protected route groups
- [ ] `adminMiddleware` — Elysia derived macro or `onBeforeHandle`:
  - [ ] Depends on `authMiddleware` (userId must already be in context)
  - [ ] Loads user from DB via `UserRepository.findById`
  - [ ] If `user.isAdmin()` is false → return 403
  - [ ] Applied only to admin-only routes (e.g., `GET /api/users`)

### Error Handling
- [ ] Map `DomainError` types to HTTP status codes:
  - [ ] `ValidationError` → 400
  - [ ] `NotFoundError` → 404
  - [ ] `UnauthorizedError` → 401
  - [ ] `ForbiddenError` → 403
  - [ ] `ConflictError` → 409
  - [ ] `InternalError` → 500
- [ ] Global error handler in Elysia using `onError` hook
- [ ] Returns JSON: `{ error: { type, message } }`

### Composition Root
- [ ] Create `packages/backend/src/infrastructure/dependencies.ts`:
  - [ ] Import `sql` from database module
  - [ ] Instantiate infrastructure services:
    - [ ] `passwordHasher = new BcryptPasswordHasher()`
    - [ ] `authService = new JwtAuthService(JWT_SECRET)`
    - [ ] `emailService = new NodemailerEmailService(SMTP_CONFIG)`
    - [ ] `bossEmail = process.env.BOSS_EMAIL`
  - [ ] Instantiate repositories (pass `sql`):
    - [ ] `userRepository = new SqlUserRepository(sql)`
    - [ ] `productRepository = new SqlProductRepository(sql)`
    - [ ] `locationRepository = new SqlLocationRepository(sql)`
    - [ ] `historyRepository = new SqlHistoryRepository(sql)`
  - [ ] Instantiate event bus:
    - [ ] `eventBus = new InMemoryEventBus()`
    - [ ] Register all event listeners (pass `emailService`, `bossEmail`)
  - [ ] Instantiate use cases (pass repositories + services):
    - [ ] `registerUserUseCase = new RegisterUserUseCase(userRepository, passwordHasher, eventBus)`
    - [ ] `loginUseCase = new LoginUseCase(userRepository, passwordHasher, authService)`
    - [ ] `createProductUseCase = new CreateProductUseCase(productRepository, eventBus)`
    - [ ] etc.
  - [ ] Pass use cases to route groups
- [ ] Create main entry point (`index.ts`):
  - [ ] Import Elysia app
  - [ ] Register CORS plugin
  - [ ] Register all route groups (passing use cases)
  - [ ] Register global error handler
  - [ ] Register auth middleware
  - [ ] `app.listen(PORT)`

---

## Phase 5: Integration & Polish
- [ ] Validate all TypeBox schemas match application DTOs and business rules
- [ ] Handle edge cases:
  - [ ] Product name uniqueness (global scope at minimum)
  - [ ] Stock exit with quantity > current stock (allow negative per business rule)
  - [ ] Concurrent stock modifications (last-write-wins for v1)
- [ ] Add request logging (Elysia `onRequest` / `onResponse` hooks)
- [ ] Write seed script to populate DB with test data (locations, admin user with role `ADMIN`, sample products)
- [ ] Test all endpoints manually or with Bun's built-in test runner
- [ ] Ensure CORS works with frontend dev server
- [ ] Verify all error responses follow `{ error: { type, message } }` format

---

## Phase 6: Future Considerations (not v1)
- [ ] Refresh tokens / token expiration
- [ ] Admin-only endpoints (check `user.isAdmin()` in use cases or middleware)
- [ ] Pagination for products and history
- [ ] Search/filter products by name
- [ ] Soft delete vs hard delete
- [ ] Database transactions for atomic stock updates
- [ ] Rate limiting
- [ ] API documentation (Elysia has built-in Swagger/OpenAPI via `@elysiajs/swagger`)
- [ ] Unit tests for domain logic (value objects, entities, services)
- [ ] Integration tests for use cases
- [ ] E2E tests for HTTP endpoints
