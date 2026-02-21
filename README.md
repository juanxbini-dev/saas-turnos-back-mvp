# SaaS Turnos - Backend

Backend para sistema de gestión de turnos con **Clean Architecture** usando Node.js + Express + TypeScript + PostgreSQL. Sistema multitenant con autenticación JWT y gestión completa de clientes, servicios y turnos.

## Stack Tecnológico

- **Node.js + TypeScript** - Runtime y tipado estático
- **Express.js** - Framework web minimalista
- **PostgreSQL** - Base de datos relacional
- **JWT + bcrypt** - Autenticación y hashing de passwords
- **Clean Architecture** - Arquitectura por capas con separación de responsabilidades

## 🎯 Propósito del Sistema

Sistema completo de gestión de turnos para empresas de servicios. Implementa un sistema multitenant donde cada empresa tiene su propio catálogo de clientes, servicios y turnos, con aislamiento completo de datos y gestión centralizada de autenticación.

## 🏗️ Estado Actual del Sistema

### ✅ Módulos Implementados

- **🔐 Autenticación Completa**: Login, logout, refresh tokens con cookies HttpOnly
- **👥 Gestión de Usuarios**: CRUD completo con roles y activación
- **🏢 Empresas**: Sistema multitenant con dominios personalizados
- **👤 Clientes**: Catálogo completo con búsqueda, filtrado y paginación
- **🛠️ Servicios**: Gestión de servicios con duración y precios
- **📅 Turnos**: Sistema completo de agendamiento con disponibilidad
- **🔒 Seguridad**: JWT, bcrypt, CORS, validaciones

### 🏗️ Arquitectura Implementada

```
backend/
├── src/
│   ├── domain/                 # Capa de Dominio
│   │   ├── entities/
│   │   │   ├── User.ts         # Entidad de usuario multitenant
│   │   │   ├── RefreshToken.ts # Tokens de renovación
│   │   │   ├── Health.ts       # Health checks
│   │   │   ├── Empresa.ts      # Entidad de empresa
│   │   │   ├── Cliente.ts      # Entidad de cliente
│   │   │   ├── Servicio.ts     # Entidad de servicio
│   │   │   └── Turno.ts        # Entidad de turno
│   │   └── repositories/
│   │       ├── IDatabaseRepository.ts
│   │       ├── IUserRepository.ts
│   │       ├── IRefreshTokenRepository.ts
│   │       ├── IEmpresaRepository.ts
│   │       ├── IClienteRepository.ts
│   │       ├── IServicioRepository.ts
│   │       └── ITurnoRepository.ts
│   ├── application/           # Capa de Aplicación
│   │   └── use-cases/
│   │       ├── auth/          # Casos de uso de autenticación
│   │       │   ├── LoginUseCase.ts
│   │       │   ├── LogoutUseCase.ts
│   │       │   └── RefreshUseCase.ts
│   │       ├── usuarios/      # Gestión de usuarios
│   │       ├── empresas/      # Gestión de empresas
│   │       ├── clientes/      # Gestión de clientes
│   │       ├── servicios/     # Gestión de servicios
│   │       ├── turnos/        # Gestión de turnos
│   │       ├── GetHealthUseCase.ts
│   │       └── TestDatabaseUseCase.ts
│   ├── infrastructure/        # Capa de Infraestructura
│   │   ├── database/
│   │   │   └── postgres.connection.ts
│   │   ├── repositories/
│   │   │   ├── PostgresUserRepository.ts
│   │   │   ├── PostgresRefreshTokenRepository.ts
│   │   │   ├── PostgresEmpresaRepository.ts
│   │   │   ├── PostgresClienteRepository.ts
│   │   │   ├── PostgresServicioRepository.ts
│   │   │   └── PostgresTurnoRepository.ts
│   │   └── security/
│   │       ├── crypto.service.ts
│   │       ├── jwt.service.ts
│   │       ├── password.service.ts
│   │       └── token.service.ts
│   ├── presentation/          # Capa de Presentación
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── usuarios.controller.ts
│   │   │   ├── empresas.controller.ts
│   │   │   ├── clientes.controller.ts
│   │   │   ├── servicios.controller.ts
│   │   │   ├── turnos.controller.ts
│   │   │   ├── health.controller.ts
│   │   │   └── test.controller.ts
│   │   ├── middlewares/
│   │   │   └── error.middleware.ts
│   │   └── routes/
│   │       ├── auth.routes.ts
│   │       ├── usuarios.routes.ts
│   │       ├── empresas.routes.ts
│   │       ├── clientes.routes.ts
│   │       ├── servicios.routes.ts
│   │       ├── turnos.routes.ts
│   │       └── index.ts
│   ├── config/
│   │   └── env.ts
│   ├── app.ts
│   └── server.ts
├── docs/
│   ├── database/
│   │   ├── schema.sql
│   │   └── seed.sql
│   └── README.md
└── package.json
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

## 🚀 API Endpoints

### 🔐 Autenticación
| Método | Path | Descripción | Auth Requerida |
|--------|------|-------------|----------------|
| POST | `/auth/login` | Login de usuario | No |
| POST | `/auth/refresh` | Renovar token | Cookie refreshToken |
| POST | `/auth/logout` | Logout | Cookie refreshToken |

### 👥 Usuarios
| Método | Path | Descripción | Roles Permitidos |
|--------|------|-------------|------------------|
| GET | `/api/usuarios` | Listar usuarios | Admin |
| POST | `/api/usuarios` | Crear usuario | Admin |
| PUT | `/api/usuarios/:id` | Actualizar usuario | Admin, Propio |
| DELETE | `/api/usuarios/:id` | Eliminar usuario | Admin |

### 🏢 Empresas
| Método | Path | Descripción | Roles Permitidos |
|--------|------|-------------|------------------|
| GET | `/api/empresas` | Listar empresas | Admin |
| POST | `/api/empresas` | Crear empresa | Admin |
| PUT | `/api/empresas/:id` | Actualizar empresa | Admin |
| DELETE | `/api/empresas/:id` | Eliminar empresa | Admin |

### 👤 Clientes
| Método | Path | Descripción | Roles Permitidos |
|--------|------|-------------|------------------|
| GET | `/api/clientes` | Listar clientes (tenant) | Admin, Staff |
| POST | `/api/clientes` | Crear cliente | Admin, Staff |
| PUT | `/api/clientes/:id` | Actualizar cliente | Admin, Staff |
| DELETE | `/api/clientes/:id` | Eliminar cliente | Admin |
| PATCH | `/api/clientes/:id/toggle` | Activar/Desactivar | Admin, Staff |

### 🛠️ Servicios
| Método | Path | Descripción | Roles Permitidos |
|--------|------|-------------|------------------|
| GET | `/api/servicios` | Listar servicios (tenant) | Admin, Staff |
| POST | `/api/servicios` | Crear servicio | Admin, Staff |
| PUT | `/api/servicios/:id` | Actualizar servicio | Admin, Staff |
| DELETE | `/api/servicios/:id` | Eliminar servicio | Admin |
| PATCH | `/api/servicios/:id/toggle` | Activar/Desactivar | Admin, Staff |

### 📅 Turnos
| Método | Path | Descripción | Roles Permitidos |
|--------|------|-------------|------------------|
| GET | `/api/turnos` | Listar turnos (tenant) | Admin, Staff |
| POST | `/api/turnos` | Crear turno | Admin, Staff |
| PUT | `/api/turnos/:id` | Actualizar turno | Admin, Staff |
| DELETE | `/api/turnos/:id` | Cancelar turno | Admin, Staff |
| GET | `/api/turnos/disponibilidad` | Ver disponibilidad | Admin, Staff, Cliente |

### 🏠 Health & System
| Método | Path | Descripción | Auth Requerida |
|--------|------|-------------|----------------|
| GET | `/health` | Health check del sistema | No |
| GET | `/api/test-db` | Test conexión a BD | No |

## 🗄️ Base de Datos

### Schema Principal

```sql
-- Empresas (Multitenant)
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    dominio VARCHAR(255) UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Usuarios (con soporte multitenant)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    empresa_id UUID REFERENCES empresas(id),
    roles TEXT[] DEFAULT ARRAY['user'],
    activo BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Clientes (por empresa)
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(50),
    empresa_id UUID REFERENCES empresas(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Servicios (por empresa)
CREATE TABLE servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    duracion INTEGER NOT NULL, -- minutos
    precio DECIMAL(10,2),
    empresa_id UUID REFERENCES empresas(id),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Turnos (por empresa)
CREATE TABLE turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id),
    servicio_id UUID REFERENCES servicios(id),
    empresa_id UUID REFERENCES empresas(id),
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, confirmado, cancelado, completado
    notas TEXT,
    creado_por UUID REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES usuarios(id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## ⚙️ Configuración y Variables de Entorno

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
| `REFRESH_TOKEN_SECRET` | Secreto para refresh tokens | `super_refresh_secret` |
| `REFRESH_TOKEN_DAYS` | Duración de refresh tokens en días | `7` |
| `NODE_ENV` | Ambiente (afecta cookies) | `development` |

### Instalación y Configuración

1. **Clonar repositorio**:
   ```bash
   git clone https://github.com/juanxbini/saas-turnos-back-mvp.git
   cd saas-turnos-back-mvp
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Crear base de datos PostgreSQL**:
   ```sql
   CREATE DATABASE turnos_db;
   CREATE USER turnos_user WITH PASSWORD 'turnos_pass';
   GRANT ALL PRIVILEGES ON DATABASE turnos_db TO turnos_user;
   ```

4. **Ejecutar schema y seed**:
   ```bash
   psql -h localhost -U turnos_user -d turnos_db -f docs/database/schema.sql
   psql -h localhost -U turnos_user -d turnos_db -f docs/database/seed.sql
   ```

5. **Configurar .env**:
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
   NODE_ENV=development
   ```

6. **Ejecutar servidor**:
   ```bash
   npm run dev
   ```

## 🔐 Sistema de Autenticación

### Flujo Completo

#### 1. Login
```
POST /auth/login
{
  "email": "usuario@empresa.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "random_token_string",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "email": "usuario@empresa.com",
      "roles": ["admin"],
      "tenant": "empresa",
      "empresaId": "uuid"
    }
  }
}
```

#### 2. Refresh Token
```
POST /auth/refresh
Cookie: refreshToken=random_token_string; HttpOnly; Secure
```

#### 3. Logout
```
POST /auth/logout
Cookie: refreshToken=random_token_string; HttpOnly; Secure
```

### Características de Seguridad

- **🍪 Cookies HttpOnly**: Refresh tokens no accesibles desde JavaScript
- **🔄 Rotación automática**: Tokens se renuevan automáticamente
- **🏢 Multitenant**: Aislamiento completo por empresa
- **⏰ Expiración**: Access tokens (15min), Refresh tokens (7 días)
- **🛡️ Revocación**: Logout invalida tokens inmediatamente
- **🔍 Auditoría**: IP y User-Agent tracking

## 🔄 Flujo de Datos

### Request → Response Flow

1. **Request HTTP** → **Router**
2. **Router** → **Controller** (con validación)
3. **Controller** → **Use Case** (lógica de negocio)
4. **Use Case** → **Repository Interface** (contrato)
5. **Repository Implementation** → **PostgreSQL** (datos)
6. **Response** → **Controller** → **Router** → **Cliente**

### Ejemplo: Crear Cliente

```
POST /api/clientes
{
  "nombre": "Juan Pérez",
  "email": "juan@cliente.com",
  "telefono": "+5491123456789"
}
    ↓
Auth Middleware (verifica JWT)
    ↓
ClientesController.create()
    ↓
CreateClienteUseCase.execute()
    ↓
IClienteRepository.create()
    ↓
PostgresClienteRepository.create()
    ↓
INSERT INTO clientes (...) VALUES (...)
    ↓
Response 201 con cliente creado
```

## 🌐 Conexión con Frontend

Este backend está diseñado para integrarse perfectamente con el [frontend React](https://github.com/juanxbini/saas-turnos-frontend-mvp.git).

### Integración

- **✅ CORS configurado** para `localhost:5173` y `localhost:5174`
- **✅ Endpoints compatibles** con axiosInstance del frontend
- **✅ Formato de respuesta** consistente
- **✅ Refresh tokens en cookies** como espera el frontend

### Flujo Frontend-Backend

```
React App → axiosInstance → Backend Express → Use Cases → PostgreSQL
    ↑            ↓              ↓            ↓           ↓
Toast notifications ← HTTP responses ← Controllers ← Entities ← SQL
```

## 🚀 Deployment

### Producción

1. **Variables de entorno**:
   ```env
   NODE_ENV=production
   PORT=4000
   DB_HOST=your-db-host
   # ... otras variables
   ```

2. **Build**:
   ```bash
   npm run build
   ```

3. **Start**:
   ```bash
   npm start
   ```

### Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]
```

## 🧪 Testing

### Endpoints de Prueba

```bash
# Health check
curl http://localhost:4000/health

# Test database
curl http://localhost:4000/api/test-db

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"demo123"}'
```

## 📊 Métricas y Monitoreo

### Logs
- **Development**: Console logging detallado
- **Production**: Estructurado para ELK stack

### Health Checks
- **Application**: `/health` endpoint
- **Database**: `/api/test-db` endpoint
- **System**: Uptime y memory usage

## 🔄 Versionado

- **Branch principal**: `develop`
- **Version**: 1.0.0-MVP
- **Cambios breaking**: SemVer estricto

## 🤝 Contribución

### Flujo de Trabajo

1. Fork del repositorio
2. Feature branch desde `develop`
3. Pull request con tests
4. Code review obligatorio
5. Merge a `develop`

### Convenciones

- **Commits**: Conventional Commits
- **Code**: ESLint + Prettier
- **Tests**: Jest + Supertest

---

**Sistema de gestión de turnos multitenant - Backend MVP**

📧 **Soporte**: Issues en GitHub
🌐 **Frontend**: [saas-turnos-frontend-mvp](https://github.com/juanxbini/saas-turnos-frontend-mvp.git)
