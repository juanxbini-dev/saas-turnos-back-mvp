# Backend Boilerplate - Node.js + TypeScript + Clean Architecture

Backend Node.js con TypeScript siguiendo Clean Architecture, diseñado como boilerplate base para aplicaciones empresariales con autenticación JWT y soporte multitenant. Forma parte del boilerplate completo junto con el frontend React.

## Stack Tecnológico

- **Node.js + TypeScript** - Runtime y tipado estático
- **Express.js** - Framework web minimalista
- **PostgreSQL** - Base de datos relacional
- **JWT + bcrypt** - Autenticación y hashing de passwords
- **Clean Architecture** - Arquitectura por capas con separación de responsabilidades

## Propósito del Boilerplate

Este backend está diseñado como el servidor de autenticación y API para el frontend React. Implementa un sistema de login completo con refresh tokens, soporte multitenant (usuario@empresa.com), y una arquitectura escalable que permite cambiar fácilmente la base de datos o el framework web sin afectar la lógica de negocio.

## Estructura de Carpetas

```
backend/
├── src/
│   ├── app.ts                 # Configuración de Express y middlewares
│   ├── server.ts              # Punto de entrada: conexión BD y start server
│   ├── config/                # Configuración del proyecto
│   │   └── env.ts            # Variables de entorno y configuración centralizada
│   ├── domain/                # Capa más interna: lógica de negocio pura
│   │   ├── entities/          # Entidades del dominio (sin dependencias externas)
│   │   │   ├── Health.ts      # Entidad para health checks
│   │   │   ├── RefreshToken.ts # Entidad de refresh tokens
│   │   │   └── User.ts        # Entidad de usuario con campos multitenant
│   │   └── repositories/      # Interfaces de repositorios (contratos puros)
│   │       ├── IDatabaseRepository.ts # Interfaz para operaciones de BD
│   │       ├── IRefreshTokenRepository.ts # Interfaz para refresh tokens
│   │       └── IUserRepository.ts # Interfaz para operaciones de usuarios
│   ├── application/           # Capa de casos de uso (orchestration)
│   │   └── use-cases/
│   │       ├── CheckUsersUseCase.ts # Verificar usuarios en BD
│   │       ├── GetHealthUseCase.ts # Health check del sistema
│   │       ├── LoginUseCase.ts # Flujo completo de login
│   │       ├── LogoutUseCase.ts # Invalidación de refresh tokens
│   │       ├── RefreshUseCase.ts # Renovación de access tokens
│   │       └── TestDatabaseUseCase.ts # Prueba de conexión a BD
│   ├── infrastructure/        # Capa externa: implementaciones concretas
│   │   ├── database/          # Conexión y configuración de PostgreSQL
│   │   │   └── postgres.connection.ts # Pool de conexiones a PostgreSQL
│   │   ├── repositories/      # Implementaciones de repositorios PostgreSQL
│   │   │   ├── PostgresDatabaseRepository.ts # Queries genéricas de BD
│   │   │   ├── PostgresRefreshTokenRepository.ts # CRUD refresh tokens
│   │   │   └── PostgresUserRepository.ts # CRUD usuarios con JOIN empresas
│   │   └── security/          # Servicios de seguridad (implementación)
│   │       ├── crypto.service.ts # Utilidades criptográficas
│   │       ├── jwt.service.ts # Generación/validación JWT simple
│   │       ├── password.service.ts # Comparación de passwords con bcrypt
│   │       └── token.service.ts # Manejo completo de tokens (access + refresh)
│   └── presentation/          # Capa más externa: HTTP y routing
│       ├── controllers/        # Controladores HTTP (inyección de dependencias)
│       │   ├── auth.controller.ts # Login con cookies HttpOnly
│       │   ├── check.controller.ts # Verificación de usuarios
│       │   ├── health.controller.ts # Health check endpoint
│       │   ├── logout.controller.ts # Logout con invalidación
│       │   ├── refresh.controller.ts # Refresh token endpoint
│       │   └── test.controller.ts # Test de conexión a BD
│       ├── middlewares/        # Middlewares Express
│       │   └── error.middleware.ts # Manejo centralizado de errores
│       └── routes/            # Definición de rutas y dependencias
│           ├── index.ts       # Router principal con inyección manual
│           ├── auth.routes.ts  # Rutas de autenticación
│           ├── logout.routes.ts # Rutas de logout
│           └── refresh.routes.ts # Rutas de refresh
├── docs/                      # Documentación adicional
├── .env                       # Variables de entorno (no commitear)
└── package.json              # Dependencias y scripts
```

## Clean Architecture - Modelo Mental

### Flujo Real del Proyecto

```
HTTP Request → Controller → Use Case → Repository Interface → Repository Implementation → PostgreSQL
     ↑              ↓           ↓              ↓                    ↓                      ↓
HTTP Response ← Presenter ← Entity ← Domain Logic ← Contract Definition ← SQL Queries
```

### Regla de Dependencia

**Las capas internas nunca dependen de las capas externas.**

- **Domain**: No sabe nada de Express, PostgreSQL, ni HTTP
- **Application**: Solo conoce interfaces del domain y tipos simples
- **Infrastructure**: Implementa las interfaces del domain, conoce PostgreSQL
- **Presentation**: Orquesta use cases, maneja HTTP, conoce Express

### ¿Por qué importa para un Boilerplate?

Esta arquitectura permite cambiar tecnología sin afectar la lógica de negocio:

```typescript
// Ejemplo: Cambiar PostgreSQL por MongoDB
// Solo se modifica la capa infrastructure:
class MongoUserRepository implements IUserRepository {
  // Misma interfaz, diferente implementación
}

// El LoginUseCase sigue funcionando sin cambios
const loginUseCase = new LoginUseCase(
  new MongoUserRepository(),     // ← Solo cambia esto
  new MongoRefreshTokenRepository(),
  new PasswordService(),
  TokenService
);
```

## Configuración y Variables de Entorno

### Variables Necesarias

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `4000` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5433` |
| `DB_USER` | Usuario de BD | `turnos_user` |
| `DB_PASSWORD` | Password de BD | `turnos_pass` |
| `DB_NAME` | Nombre de la BD | `turnos_db` |
| `JWT_SECRET` | Secreto para access tokens | `super_secret_key` |
| `REFRESH_TOKEN_SECRET` | Secreto para refresh tokens (opcional) | `super_refresh_secret` |
| `REFRESH_TOKEN_DAYS` | Duración de refresh tokens en días | `7` |
| `NODE_ENV` | Ambiente (affecta cookies) | `development` |

### Configuración desde Cero

1. **Crear base de datos PostgreSQL**:
   ```sql
   CREATE DATABASE turnos_db;
   CREATE USER turnos_user WITH PASSWORD 'turnos_pass';
   GRANT ALL PRIVILEGES ON DATABASE turnos_db TO turnos_user;
   ```

2. **Crear tablas** (ver documentación en docs/):

3. **Configurar .env**:
   ```env
   PORT=4000
   DB_HOST=localhost
   DB_PORT=5433
   DB_USER=turnos_user
   DB_PASSWORD=turnos_pass
   DB_NAME=turnos_db
   JWT_SECRET=super_secret_key
   REFRESH_TOKEN_SECRET=super_refresh_secret
   REFRESH_TOKEN_DAYS=7
   ```

4. **Instalar y correr**:
   ```bash
   npm install
   npm run dev
   ```

## Sistema de Autenticación

### Flujo Completo

#### 1. Login
```
POST /auth/login
{
  "email": "usuario@empresa.com",
  "password": "password123"
}
```

**Flujo interno**:
1. Controller recibe credenciales + IP + User-Agent
2. LoginUseCase parsea email como username@domain (multitenant)
3. Repository busca usuario por username y dominio con JOIN a empresas
4. Validaciones: usuario activo, empresa activa, password correcto
5. TokenService genera accessToken (JWT 15min) + refreshToken (token aleatorio)
6. RefreshTokenRepository guarda hash del token con metadata
7. UserRepository actualiza last_login
8. Response: accessToken en body, refreshToken en cookie HttpOnly

#### 2. Refresh
```
POST /auth/refresh
Cookie: refreshToken=token_http_only
```

**Flujo interno**:
1. Controller lee cookie HttpOnly
2. RefreshUseCase busca hash en BD, valida que no esté revocado
3. TokenService genera nuevo accessToken con misma payload
4. RefreshTokenRepository actualiza last_used_at
5. Response: nuevo accessToken (refresh token sigue en cookie)

#### 3. Logout
```
POST /auth/logout
Cookie: refreshToken=token_http_only
```

**Flujo interno**:
1. Controller lee cookie HttpOnly
2. LogoutUseCase busca refresh token en BD
3. RefreshTokenRepository marca como revocado (revoked_at = NOW())
4. Controller limpia cookie
5. Response: éxito sin contenido

### Servicios de Seguridad

#### jwt.service.ts
**Responsabilidad**: Generación y validación simple de JWT
```typescript
sign(payload: { userId: string; empresaId: string; roles: string[] }): string
```

#### password.service.ts
**Responsabilidad**: Comparación segura de passwords con bcrypt
```typescript
compare(password: string, hash: string): Promise<boolean>
```

#### crypto.service.ts
**Responsabilidad**: Utilidades criptográficas
```typescript
hashToken(token: string): string          // SHA-256 hash
generateSecureToken(length: number): string // Random bytes hex
generateUUID(): string                    // UUID v4
isValidUUID(uuid: string): boolean        // Validación UUID
```

#### token.service.ts
**Responsabilidad**: Manejo completo de tokens (access + refresh)
```typescript
generateAccessToken(payload): string      // JWT 15min con issuer/audience
generateRefreshToken(): { token, hash, expiresAt } // Token aleatorio + hash
verifyAccessToken(token): TokenPayload    // Validación JWT con tipo
getAccessTokenExpiration(): number        // 15 * 60 segundos
getRefreshTokenExpiration(): number       // 7 * 24 * 60 * 60 segundos
```

## Capa de Dominio

### Entidades Disponibles

#### User.ts
```typescript
interface User {
  id: string;              // UUID del usuario
  email: string;           // email completo (usuario@empresa.com)
  password: string;        // hash bcrypt
  empresa_id: string;      // FK a tabla empresas
  roles: string[];        // Array de roles ['admin', 'user']
  activo: boolean;         // Estado del usuario
  tenant?: string;         // Dominio de la empresa (from JOIN)
  empresa_activa?: boolean; // Estado de la empresa (from JOIN)
}
```

#### RefreshToken.ts
```typescript
interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;        // SHA-256 del token
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  isActive: boolean;
  userInfo: {              // Payload del usuario al crear
    id: string;
    email: string;
    roles: string[];
    tenant: string;
    empresaId: string;
  };
}
```

#### Health.ts
```typescript
interface Health {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  database: 'connected' | 'disconnected';
}
```

### Interfaces de Repositorios

#### IUserRepository.ts
```typescript
interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsernameAndDomain(username: string, domain: string): Promise<User | null>;
  updateLastLogin(userId: string): Promise<void>;
}
```

#### IRefreshTokenRepository.ts
```typescript
interface IRefreshTokenRepository {
  create(data: CreateRefreshTokenData): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  revokeByUserId(userId: string): Promise<void>;
}
```

#### IDatabaseRepository.ts
```typescript
interface IDatabaseRepository {
  testConnection(): Promise<boolean>;
}
```

**Importante**: Las interfaces son el contrato que separa la lógica de negocio de la implementación. El LoginUseCase no sabe si está usando PostgreSQL, MongoDB, o archivos JSON.

## Casos de Uso

### LoginUseCase
**Responsabilidad**: Orquestar el flujo completo de login con validaciones multitenant
**Dependencias**: IUserRepository, IRefreshTokenRepository, PasswordService, TokenService
**Retorna**: LoginResponse con accessToken, refreshToken, expiresIn, user

### RefreshUseCase
**Responsabilidad**: Renovar access token usando refresh token de cookie
**Dependencias**: IRefreshTokenRepository, TokenService
**Retorna**: Nuevo accessToken con misma payload

### LogoutUseCase
**Responsabilidad**: Invalidar refresh token y limpiar cookie
**Dependencias**: IRefreshTokenRepository
**Retorna**: void (éxito sin contenido)

### GetHealthUseCase
**Responsabilidad**: Verificar estado del sistema (uptime, BD)
**Dependencias**: Ninguna (estado simple)
**Retorna**: Health status

### TestDatabaseUseCase
**Responsabilidad**: Probar conexión a base de datos
**Dependencias**: IDatabaseRepository
**Retorna**: boolean indicando conexión exitosa

### CheckUsersUseCase
**Responsabilidad**: Verificar existencia de usuarios en BD
**Dependencias**: IUserRepository
**Retorna**: Array de usuarios básicos (id, email, activo)

### Patrón de Inyección de Dependencias

Todos los use cases reciben sus dependencias por constructor:

```typescript
// En el controller
const loginUseCase = new LoginUseCase(
  userRepository,           // ← Inyectado
  refreshTokenRepository,   // ← Inyectado
  passwordService,          // ← Inyectado
  TokenService              // ← Inyectado (singleton)
);

// El use case nunca importa directamente
export class LoginUseCase {
  constructor(
    private userRepository: IUserRepository,        // ← Interface
    private refreshTokenRepository: IRefreshTokenRepository, // ← Interface
    private passwordService: PasswordService,      // ← Concreto
    private tokenService: typeof TokenService       // ← Singleton
  ) {}
}
```

## Infraestructura

### Conexión a PostgreSQL

**postgres.connection.ts** implementa un pool de conexiones:

```typescript
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password || '',
  database: config.database.name,
});

export const connectDatabase = async (): Promise<void> => {
  await pool.connect();
  console.log('Database connected');
};
```

**Ventajas del pool**:
- Reutilización de conexiones
- Manejo automático de conexión/disconnection
- Limitación de conexiones concurrentes
- Timeout y retry automáticos

### Repositorios PostgreSQL

#### PostgresUserRepository
**Métodos implementados**:
- `findByEmail()`: JOIN con tabla empresas para obtener tenant y estado
- `findByUsernameAndDomain()`: Query multitenant para login
- `updateLastLogin()`: Actualización timestamp de último login

**Query ejemplo**:
```sql
SELECT u.*, e.dominio, e.activo as empresa_activa
FROM usuarios u
JOIN empresas e ON u.empresa_id = e.id
WHERE u.username = $1 AND e.dominio = $2
LIMIT 1;
```

#### PostgresRefreshTokenRepository
**Métodos implementados**:
- `create()`: Insert con token hash y metadata
- `findByTokenHash()`: Búsqueda por hash SHA-256
- `revokeByTokenHash()`: UPDATE revoked_at = NOW()
- `revokeByUserId()**: Invalidación masiva por usuario

#### PostgresDatabaseRepository
**Métodos implementados**:
- `testConnection()`: Query simple para verificar conexión

**Importante**: Esta es la única capa que conoce SQL. Cambiar PostgreSQL por otro motor solo requiere reimplementar estos repositorios.

## Capa de Presentación

### Controllers

#### auth.controller.ts
**Responsabilidad**: Orquestar LoginUseCase, manejar cookies HttpOnly
**Use case**: LoginUseCase
**Response**: `{ success: true, data: { accessToken, refreshToken, expiresIn, user } }`

#### refresh.controller.ts
**Responsabilidad**: Leer cookie, orquestar RefreshUseCase
**Use case**: RefreshUseCase
**Response**: `{ success: true, data: { accessToken, expiresIn } }`

#### logout.controller.ts
**Responsabilidad**: Leer cookie, orquestar LogoutUseCase, limpiar cookie
**Use case**: LogoutUseCase
**Response**: `{ success: true, message: 'Logged out successfully' }`

#### health.controller.ts
**Responsabilidad**: Retornar estado del sistema
**Use case**: GetHealthUseCase
**Response**: `{ success: true, data: { status, timestamp, uptime, database } }`

#### test.controller.ts
**Responsabilidad**: Probar conexión a BD
**Use case**: TestDatabaseUseCase
**Response**: `{ success: true, data: { connected: boolean } }`

#### check.controller.ts
**Responsabilidad**: Verificar usuarios en BD
**Use case**: CheckUsersUseCase
**Response**: `{ success: true, data: { users: UserBasic[] } }`

### Middlewares

#### error.middleware.ts
**Manejo de errores centralizado**:

```typescript
interface CustomError extends Error {
  statusCode?: number;
}

export const errorHandler = (error: CustomError, req, res, next): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  
  console.error('Error:', error);
  
  res.status(statusCode).json({
    success: false,
    message
  });
};
```

**Tipos de error manejados**:
- **400**: Bad Request (datos inválidos)
- **401**: Unauthorized (credenciales inválidas)
- **500**: Internal Server Error (error del sistema)

**asyncHandler**: Wrapper para manejo automático de errores async:
```typescript
export const asyncHandler = (fn: Function) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

### Rutas

| Método | Path | Controller | Auth Requerida |
|--------|------|-------------|----------------|
| GET | `/health` | HealthController | No |
| GET | `/api/test-db` | TestController | No |
| GET | `/api/check-users` | CheckController | No |
| POST | `/auth/login` | AuthController | No |
| POST | `/auth/refresh` | RefreshController | Cookie refreshToken |
| POST | `/auth/logout` | LogoutController | Cookie refreshToken |

### Estructura de Routes

**index.ts**: Router principal con inyección manual de dependencias
```typescript
// Dependencies
const databaseRepository = new PostgresDatabaseRepository();
const getHealthUseCase = new GetHealthUseCase();
const testDatabaseUseCase = new TestDatabaseUseCase(databaseRepository);

// Controllers
const healthController = new HealthController(getHealthUseCase);
const testController = new TestController(testDatabaseUseCase);
```

## Cómo Agregar un Nuevo Módulo

Ejemplo: Agregar módulo **Producto** siguiendo Clean Architecture:

### 1. Crear Entidad en Domain
```typescript
// src/domain/entities/Product.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  empresa_id: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### 2. Crear Interfaz de Repository
```typescript
// src/domain/repositories/IProductRepository.ts
import { Product } from '../entities/Product';

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findByEmpresa(empresaId: string): Promise<Product[]>;
  create(product: CreateProductData): Promise<Product>;
  update(id: string, data: UpdateProductData): Promise<Product>;
  delete(id: string): Promise<void>;
}
```

### 3. Crear Use Cases
```typescript
// src/application/use-cases/CreateProductUseCase.ts
export class CreateProductUseCase {
  constructor(
    private productRepository: IProductRepository
  ) {}

  async execute(data: CreateProductRequest): Promise<Product> {
    // Validaciones de negocio
    if (data.price <= 0) {
      throw new Error('Price must be positive');
    }

    // Crear producto
    return await this.productRepository.create({
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
}
```

### 4. Implementar Repository
```typescript
// src/infrastructure/repositories/PostgresProductRepository.ts
export class PostgresProductRepository implements IProductRepository {
  async findById(id: string): Promise<Product | null> {
    const query = 'SELECT * FROM products WHERE id = $1 AND activo = true';
    // Implementación SQL
  }

  // ... otros métodos
}
```

### 5. Crear Controller
```typescript
// src/presentation/controllers/product.controller.ts
export class ProductController {
  private createProductUseCase: CreateProductUseCase;

  constructor() {
    const productRepository = new PostgresProductRepository();
    this.createProductUseCase = new CreateProductUseCase(productRepository);
  }

  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.createProductUseCase.execute(req.body);
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error); // Deja que el error middleware lo maneje
    }
  }
}
```

### 6. Registrar Rutas
```typescript
// src/presentation/routes/product.routes.ts
import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';

const router = Router();
const productController = new ProductController();

router.post('/products', (req, res, next) => 
  productController.createProduct(req, res, next)
);

export default router;

// Agregar a src/presentation/routes/index.ts
import productRoutes from './product.routes';
router.use('/', productRoutes);
```

## Guía para Empezar un Proyecto Nuevo

### Pasos Ordenados

1. **Clonar el boilerplate**
   ```bash
   git clone <repo-url> mi-backend
   cd mi-backend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env con valores del proyecto
   ```

4. **Crear base de datos PostgreSQL**
   ```sql
   CREATE DATABASE mi_proyecto_db;
   CREATE USER mi_proyecto_user WITH PASSWORD 'secure_pass';
   GRANT ALL PRIVILEGES ON DATABASE mi_proyecto_db TO mi_proyecto_user;
   ```

5. **Crear tablas básicas**
   - Usar scripts en `docs/database/` del boilerplate
   - Adaptar nombres de tablas si es necesario

6. **Correr el servidor**
   ```bash
   npm run dev
   ```

7. **Probar endpoints**
   ```bash
   # Health check
   curl http://localhost:4000/health
   
   # Test database
   curl http://localhost:4000/api/test-db
   ```

### Qué Modificar

**Obligatorio**:
- `package.json`: nombre, descripción, autor
- `.env`: todas las variables de entorno
- Tablas de BD: adaptar a tu modelo de datos
- `src/app.ts`: CORS origins para tu frontend

**Opcional**:
- Agregar nuevos módulos siguiendo la guía
- Modificar tiempo de expiración de tokens
- Personalizar respuestas HTTP

### Qué NO Tocar Nunca

**Arquitectura core**:
- Estructura de capas (domain/application/infrastructure/presentation)
- Interfaces de repositorios (son contratos puros)
- Patrón de inyección de dependencias manual
- Sistema de errores centralizado

**Seguridad**:
- Lógica de refresh tokens
- Manejo de cookies HttpOnly
- Validaciones de auth en los use cases

## Convenciones del Proyecto

### Nombres de Archivos por Capa

- **Entities**: PascalCase singular (`User.ts`, `Product.ts`)
- **Repositories**: `I` + PascalCase (`IUserRepository.ts`)
- **Use Cases**: PascalCase + `UseCase` (`LoginUseCase.ts`)
- **Controllers**: PascalCase + `Controller` (`AuthController.ts`)
- **Services**: PascalCase + `Service` (`PasswordService.ts`)

### Patrón de Respuesta HTTP

**Éxito**:
```typescript
{
  success: true,
  data: {
    // Datos del response
  }
}
```

**Error**:
```typescript
{
  success: false,
  message: "Error descriptivo"
}
```

### Manejo de Errores en Use Cases

**Siempre lanzar Error con mensaje descriptivo**:
```typescript
// ✅ Correcto
if (!user) {
  throw new Error('Credenciales inválidas');
}

if (!user.activo) {
  throw new Error('Usuario inactivo');
}

// ❌ Incorrecto
if (!user) {
  return null; // No llega al error middleware
}
```

El error middleware automáticamente convertirá el Error en respuesta HTTP con statusCode apropiado.

### Cuándo Crear Nuevo Use Case

**Crear nuevo use case cuando**:
- Es una acción de negocio distinta (crear vs actualizar vs eliminar)
- Tiene diferentes validaciones o reglas
- Requiere diferentes dependencias

**Extender use case existente cuando**:
- Es una variación de la misma acción
- Comparte las mismas validaciones y dependencias
- Solo cambia el formato de salida

---

## Conexión con el Frontend

Este backend está diseñado para trabajar perfectamente con el [frontend React boilerplate](../frontend/README.md).

### Integración

1. **CORS configurado** para `localhost:5173` y `localhost:5174`
2. **Endpoints compatibles** con el axiosInstance del frontend
3. **Formato de respuesta** consistente con lo que espera el frontend
4. **Refresh tokens en cookies HttpOnly** como espera el axiosInstance

### Flujo Completo Frontend-Backend

```
Frontend React → axiosInstance → Backend Express → Use Cases → PostgreSQL
     ↑                    ↓              ↓            ↓           ↓
Toast notifications ← HTTP responses ← Controllers ← Entities ← SQL
```

### Variables de Entorno Coordinadas

**Backend (.env)**:
```env
VITE_API_URL=http://localhost:4000  # ← Debe coincidir con PORT del backend
```

**Frontend (.env)**:
```env
VITE_API_URL=http://localhost:4000  # ← URL del backend
```

### Prueba de Integración

1. **Iniciar backend**: `npm run dev` (puerto 4000)
2. **Iniciar frontend**: `npm run dev` (puerto 5173)
3. **Probar login**: El frontend debería autenticarse exitosamente

**Desarrollado para**: Desarrolladores humanos y agentes de IA que necesiten un backend robusto y escalable como punto de partida para aplicaciones empresariales.
