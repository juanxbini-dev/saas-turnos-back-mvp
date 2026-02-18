# Backend - Clean Architecture

## 🎯 Overview

Backend implementado con **Clean Architecture** usando Node.js + Express + TypeScript + PostgreSQL.

## 🏗️ Arquitectura

### Estructura de Carpetas

```
backend/
 ├── src/
 │    ├── domain/                 # Capa de Dominio (Reglas de negocio)
 │    │     ├── entities/
 │    │     │     └── Health.ts
 │    │     └── repositories/
 │    │           └── IDatabaseRepository.ts
 │    │
 │    ├── application/           # Capa de Aplicación (Use Cases)
 │    │     └── use-cases/
 │    │           ├── GetHealthUseCase.ts
 │    │           └── TestDatabaseUseCase.ts
 │    │
 │    ├── infrastructure/        # Capa de Infraestructura (Implementaciones)
 │    │     ├── database/
 │    │     │     └── postgres.connection.ts
 │    │     └── repositories/
 │    │           └── PostgresDatabaseRepository.ts
 │    │
 │    ├── presentation/          # Capa de Presentación (API)
 │    │     ├── controllers/
 │    │     │     ├── health.controller.ts
 │    │     │     └── test.controller.ts
 │    │     ├── routes/
 │    │     │     └── index.ts
 │    │     └── middlewares/
 │    │           └── error.middleware.ts
 │    │
 │    ├── config/                # Configuración
 │    │     └── env.ts
 │    │
 │    ├── app.ts                 # Aplicación Express
 │    └── server.ts              # Punto de entrada
 │
 ├── docs/                      # Documentación
 ├── package.json
 ├── tsconfig.json
 └── .env
```

## 🧱 Principios de Clean Architecture

### 1. **Domain Layer**
- **Entidades:** Objetos de negocio puros
- **Repositorios:** Interfaces sin implementación
- **Sin dependencias externas**

### 2. **Application Layer**
- **Use Cases:** Lógica de aplicación
- **Depende solo de Domain**
- **Orquesta operaciones**

### 3. **Infrastructure Layer**
- **Implementa interfaces de Domain**
- **Conexión a base de datos**
- **Servicios externos**

### 4. **Presentation Layer**
- **Controllers:** Manejan HTTP
- **Routes:** Definen endpoints
- **Middlewares:** Procesamiento de requests

## 🚀 Endpoints

### Health Check
```
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "message": "Backend running"
}
```

### Database Test
```
GET /api/test-db
```
**Response:**
```json
{
  "database": "connected",
  "time": "2026-02-18T21:51:48.426Z"
}
```

## ⚙️ Configuración

### Variables de Entorno (.env)
```env
PORT=4000
DB_HOST=localhost
DB_PORT=5433
DB_USER=turnos_user
DB_PASSWORD=turnos_pass
DB_NAME=turnos_db
```

### Dependencias Principales
- **express:** Framework web
- **pg:** Cliente PostgreSQL
- **dotenv:** Manejo de variables de entorno
- **cors:** Cross-origin resource sharing
- **morgan:** Logging de requests

### Dependencias de Desarrollo
- **typescript:** Compilador TypeScript
- **ts-node-dev:** Desarrollo con hot-reload
- **@types/node:** Tipos Node.js
- **@types/express:** Tipos Express
- **@types/pg:** Tipos PostgreSQL
- **@types/cors:** Tipos CORS
- **@types/morgan:** Tipos Morgan

## 🛠️ Desarrollo

### Instalación
```bash
npm install
```

### Ejecución en Desarrollo
```bash
npm run dev
```

### Build para Producción
```bash
npm run build
npm start
```

## 📦 Flujo de Datos

### Request → Response Flow

1. **Request** llega a **Router**
2. **Router** invoca **Controller**
3. **Controller** ejecuta **Use Case**
4. **Use Case** utiliza **Repository Interface**
5. **Infrastructure** implementa **Repository**
6. **Database** ejecuta query
7. **Response** retorna en orden inverso

### Ejemplo: Test Database

```
HTTP Request
    ↓
Router (/api/test-db)
    ↓
TestController.testDatabase()
    ↓
TestDatabaseUseCase.execute()
    ↓
IDatabaseRepository.query()
    ↓
PostgresDatabaseRepository.query()
    ↓
PostgreSQL (SELECT NOW())
    ↓
Response JSON
```

## 🔐 Seguridad

### CORS Configurado
- **Origin:** `http://localhost:5173`
- **Credentials:** `true`

### Manejo de Errores
- **Middleware centralizado**
- **Respuestas estandarizadas**
- **Logging de errores**

## 🧪 Testing

### Endpoints de Prueba
- **Health check:** Verifica servidor
- **Database test:** Verifica conexión PostgreSQL

### Comandos de Test
```bash
# Test health endpoint
curl http://localhost:4000/health

# Test database connection
curl http://localhost:4000/api/test-db
```

## 📋 Próximos Pasos

### Módulo de Autenticación
- [ ] User entity (Domain)
- [ ] IUserRepository (Domain)
- [ ] AuthUseCases (Application)
- [ ] AuthControllers (Presentation)
- [ ] JWT middleware
- [ ] Login/Register endpoints

### Features Adicionales
- [ ] Validación de inputs
- [ ] Rate limiting
- [ ] Logging estructurado
- [ ] Unit tests
- [ ] Integration tests

## 🔄 Mantenimiento

### Reglas Clean Architecture
1. **Domain** sin dependencias externas
2. **Application** solo depende de Domain
3. **Infrastructure** implementa interfaces de Domain
4. **Presentation** solo llama UseCases
5. **Controllers** sin lógica de negocio
6. **Sin acceso directo a DB desde controllers**

### Buenas Prácticas
- **TypeScript strict mode**
- **Inyección de dependencias**
- **Error handling centralizado**
- **Logging consistente**
- **Separación estricta de responsabilidades**

---

**Backend listo para desarrollo con Clean Architecture estricta.**
