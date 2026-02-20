# Sistema de Gestión de Usuarios - Backend

## 📋 Overview

Sistema completo de gestión de usuarios implementado con arquitectura hexagonal limpia, siguiendo principios SOLID y buenas prácticas de desarrollo.

## 🏗️ Arquitectura

### Domain Layer (Capa de Dominio)
```
src/domain/
├── entities/
│   └── User.ts                    # Entidad principal con tipos
└── repositories/
    └── IUsuarioRepository.ts      # Interfaz del repositorio
```

### Application Layer (Capa de Aplicación)
```
src/application/use-cases/usuarios/
├── CreateUsuarioUseCase.ts        # Crear usuario
├── GetUsuariosUseCase.ts          # Listar usuarios
├── UpdateUsuarioDatosUseCase.ts  # Actualizar datos
├── UpdateUsuarioPasswordUseCase.ts # Actualizar contraseña
├── UpdateUsuarioRolUseCase.ts     # Cambiar rol
└── ToggleUsuarioActivoUseCase.ts  # Activar/Desactivar
```

### Infrastructure Layer (Capa de Infraestructura)
```
src/infrastructure/
├── repositories/
│   └── PostgresUsuarioRepository.ts # Implementación PostgreSQL
└── security/
    ├── password.service.ts         # Hashing de contraseñas
    └── crypto.service.ts           # Utilidades criptográficas
```

### Presentation Layer (Capa de Presentación)
```
src/presentation/
├── controllers/
│   └── usuarios.controller.ts     # Endpoints REST
├── middlewares/
│   └── auth.middleware.ts         # Autenticación y autorización
└── routes/
    └── usuarios.routes.ts         # Rutas protegidas
```

## 🔐 Seguridad

### Autenticación
- **JWT Tokens**: Access tokens con refresh automático
- **Password Hashing**: bcrypt con salt rounds = 10
- **Token Validation**: Middleware de autenticación

### Autorización
- **Role-Based Access Control**: Roles `admin` y `staff`
- **Business Rules**: Admin no puede modificarse a sí mismo
- **Protected Routes**: Middleware por rol requerido

### Validaciones
- **Username Único**: Por tenant/empresa
- **Password Mínimo**: 8 caracteres
- **Email Validation**: Formato válido requerido
- **Input Sanitization**: Prevención de inyección SQL

## 📊 Base de Datos

### Schema PostgreSQL
```sql
CREATE TABLE usuarios (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nombre TEXT NOT NULL,
    username TEXT NOT NULL,
    empresa_id TEXT NOT NULL,
    roles JSONB NOT NULL DEFAULT '["staff"]',
    activo BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_usuarios_username_empresa 
ON usuarios(username, empresa_id);
```

### Tipos de Datos
- **id**: UUID generado con crypto
- **roles**: Array JSONB `["admin", "staff"]` o `["staff"]`
- **password**: Hash bcrypt, nunca en respuestas
- **timestamps**: Auditoría completa

## 🚀 API Endpoints

### Autenticación Requerida
```
GET    /api/usuarios           # Listar usuarios (admin)
POST   /api/usuarios           # Crear usuario (admin)
PUT    /api/usuarios/:id/datos # Actualizar datos
PUT    /api/usuarios/:id/password # Cambiar contraseña
PUT    /api/usuarios/:id/rol   # Cambiar rol (admin)
PUT    /api/usuarios/:id/activo # Toggle activo (admin)
```

### Respuestas Estándar
```typescript
// Éxito
{
  success: true,
  data: UsuarioPublico[]
}

// Error
{
  success: false,
  message: "Descripción del error"
}
```

## 🎯 Reglas de Negocio

### Creación de Usuarios
- ✅ Username único por empresa
- ✅ Password mínimo 8 caracteres
- ✅ Email válido requerido
- ✅ Rol asignado automáticamente
- ✅ Activo por defecto

### Actualización de Roles
- ✅ Solo admin puede cambiar roles
- ❌ Admin no puede quitarse rol admin
- ✅ Admin puede dar rol a otros usuarios

### Activación/Desactivación
- ✅ Solo admin puede toggle activo
- ❌ Admin no puede desactivarse a sí mismo
- ✅ Usuarios inactivos no pueden autenticarse

### Actualización de Datos
- ✅ Usuario puede actualizar sus propios datos
- ✅ Admin puede actualizar datos de cualquier usuario
- ✅ Username mantiene unicidad

## 🔧 Use Cases Detallados

### CreateUsuarioUseCase
```typescript
async execute(data: CreateUsuarioData): Promise<UsuarioPublico>
```
1. Validar username único
2. Hashear password con bcrypt
3. Generar UUID con crypto
4. Asignar roles según rol base
5. Crear en repositorio
6. Retornar usuario público (sin password)

### GetUsuariosUseCase
```typescript
async execute(empresaId: string): Promise<UsuarioPublico[]>
```
1. Validar usuario autenticado
2. Listar usuarios por empresa_id
3. Excluir passwords en respuesta
4. Retornar lista de usuarios públicos

### UpdateUsuarioRolUseCase
```typescript
async execute(id: string, rol: string, adminId: string): Promise<UsuarioPublico>
```
1. Validar que admin no se modifique a sí mismo
2. Validar rol válido (admin/staff)
3. Actualizar roles en base de datos
4. Retornar usuario actualizado

## 🛡️ Middleware de Autenticación

### auth.middleware.ts
```typescript
// Verifica token JWT
const token = req.headers.authorization?.replace('Bearer ', '');
const decoded = tokenService.verifyAccessToken(token);

// Verifica usuario activo
const user = await userRepository.findById(decoded.id);
if (!user.activo) throw new Error('Usuario inactivo');

// Carga en request
req.user = {
  id: user.id,
  email: user.email,
  empresaId: user.empresa_id,
  roles: user.roles
};
```

### Autorización por Rol
```typescript
// Verifica rol específico
if (requiredRoles && !requiredRoles.some(role => user.roles.includes(role))) {
  throw new Error('Acceso denegado');
}
```

## 📝 Logs y Monitoreo

### Niveles de Log
- **INFO**: Operaciones exitosas
- **WARN**: Validaciones fallidas
- **ERROR**: Excepciones del sistema

### Eventos Logueados
- Creación de usuarios
- Cambios de rol
- Activación/Desactivación
- Intentos de acceso no autorizados

## 🔄 Cache Strategy

### Invalidación Automática
```typescript
// Después de cualquier mutación
cacheService.invalidateByPrefix(buildKey(ENTITIES.USUARIOS));
```

### TTLs Recomendados
- **Usuarios**: TTL.SHORT (1 minuto) - Datos operativos
- **Perfiles**: TTL.MEDIUM (5 minutos) - Datos de usuario

## 🚀 Despliegue

### Variables de Entorno
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Crypto
ENCRYPTION_KEY=your-encryption-key
```

### Dependencias Clave
```json
{
  "bcrypt": "^5.1.0",
  "jsonwebtoken": "^9.0.0",
  "pg": "^8.8.0",
  "uuid": "^9.0.0"
}
```

## 🧪 Testing

### Unit Tests
- Use Cases con mocks
- Repositories con test database
- Services con datos de prueba

### Integration Tests
- Endpoints completos
- Middleware de autenticación
- Validaciones de negocio

## 📈 Performance

### Optimizaciones
- **Índices**: username_empresa_id
- **Queries**: Prepared statements
- **Connection Pool**: Configurado para PostgreSQL
- **Password Hashing**: Salt rounds optimizados

### Monitoreo
- Tiempo de respuesta de endpoints
- Tasa de errores de autenticación
- Uso de conexión a base de datos

## 🔮 Mejoras Futuras

### Roadmap
- [ ] Multi-tenant avanzado
- [ ] Audit logs completos
- [ ] Rate limiting
- [ ] 2FA authentication
- [ ] Password policies configurables
- [ ] LDAP integration

### Escalabilidad
- Horizontal scaling con load balancers
- Database sharding por tenant
- Redis cache layer
- Microservices architecture
