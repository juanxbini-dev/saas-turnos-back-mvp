# Módulo de Servicios - Backend

## Overview
El módulo de servicios gestiona el catálogo de servicios de la empresa y las suscripciones de los usuarios, siguiendo una arquitectura limpia con Clean Architecture.

## Arquitectura

### Estructura de Capas

```
src/
├── domain/
│   ├── entities/
│   │   └── Servicio.ts              # Entidades de dominio
│   └── repositories/
│       ├── IServicioRepository.ts   # Interface repositorio servicios
│       └── IUsuarioServicioRepository.ts # Interface repositorio suscripciones
├── application/
│   └── use-cases/
│       └── servicios/               # Casos de uso
│           ├── GetServiciosUseCase.ts
│           ├── CreateServicioUseCase.ts
│           ├── UpdateServicioUseCase.ts
│           ├── ToggleServicioActivoUseCase.ts
│           ├── DeleteServicioUseCase.ts
│           ├── SuscribirseServicioUseCase.ts
│           ├── GetMisServiciosUseCase.ts
│           ├── UpdateMiServicioUseCase.ts
│           └── DesuscribirseServicioUseCase.ts
├── infrastructure/
│   └── repositories/
│       ├── PostgresServicioRepository.ts      # Implementación PostgreSQL
│       └── PostgresUsuarioServicioRepository.ts # Implementación PostgreSQL
└── presentation/
    ├── controllers/
    │   └── servicios.controller.ts    # Controller HTTP
    └── routes/
        └── servicios.routes.ts         # Rutas Express
```

## Entidades de Dominio

### Servicio
```typescript
interface Servicio {
  id: string
  nombre: string
  descripcion: string | null
  duracion: number
  precio_base: number | null
  precio_minimo: number | null
  precio_maximo: number | null
  empresa_id: string
  activo: boolean
  created_at: string
  updated_at: string
}
```

### UsuarioServicio
```typescript
interface UsuarioServicio {
  id: string
  usuario_id: string
  servicio_id: string
  empresa_id: string
  precio_personalizado: number | null
  duracion_personalizada: number | null
  habilitado: boolean
  nivel_habilidad: string | null
  notas: string | null
  created_at: string
  updated_at: string
  // JOIN fields
  servicio_nombre?: string
  servicio_descripcion?: string | null
  servicio_precio_base?: number | null
}
```

## Casos de Uso (Use Cases)

### Gestión de Catálogo (Admin)

#### GetServiciosUseCase
- **Propósito**: Obtener catálogo de servicios activos de una empresa
- **Validaciones**: Verificar empresa_id
- **Retorna**: Array de servicios ordenados por nombre ASC

#### CreateServicioUseCase
- **Propósito**: Crear nuevo servicio
- **Validaciones**: 
  - Nombre requerido
  - Duración > 0
- **Genera**: ID con CryptoService
- **Retorna**: Servicio creado

#### UpdateServicioUseCase
- **Propósito**: Actualizar datos de servicio
- **Validaciones**: 
  - Servicio existe
  - Nombre requerido si se proporciona
  - Duración > 0 si se proporciona
- **Actualiza**: Campo updated_at automáticamente

#### ToggleServicioActivoUseCase
- **Propósito**: Activar/desactivar servicio
- **Validaciones**: Servicio existe
- **Retorna**: Servicio con nuevo estado

#### DeleteServicioUseCase
- **Propósito**: Eliminar servicio
- **Validaciones**: Servicio existe
- **Efecto**: CASCADE elimina suscripciones asociadas

### Gestión de Suscripciones (Usuarios)

#### SuscribirseServicioUseCase
- **Propósito**: Suscribir usuario a servicio
- **Validaciones**: 
  - Usuario no está suscripto previamente
- **Genera**: ID con CryptoService
- **Retorna**: UsuarioServicio creado

#### GetMisServiciosUseCase
- **Propósito**: Obtener suscripciones del usuario
- **Incluye**: JOIN con datos del servicio padre
- **Ordena**: Por nombre de servicio ASC

#### UpdateMiServicioUseCase
- **Propósito**: Actualizar suscripción propia
- **Validaciones**: 
  - UsuarioServicio pertenece al usuario
- **Permite**: Personalizar precio, duración, notas, etc.

#### DesuscribirseServicioUseCase
- **Propósito**: Cancelar suscripción
- **Validaciones**: 
  - UsuarioServicio pertenece al usuario
- **Elimina**: Registro de usuario_servicios

## Repositorios

### IServicioRepository
```typescript
interface IServicioRepository {
  findByEmpresa(empresaId: string): Promise<Servicio[]>
  findById(id: string): Promise<Servicio | null>
  create(data: CreateServicioData): Promise<Servicio>
  update(id: string, data: UpdateServicioData): Promise<Servicio>
  toggleActivo(id: string, activo: boolean): Promise<Servicio>
  delete(id: string): Promise<void>
}
```

### IUsuarioServicioRepository
```typescript
interface IUsuarioServicioRepository {
  findByUsuario(usuarioId: string): Promise<UsuarioServicio[]>
  findByServicio(servicioId: string): Promise<UsuarioServicio[]>
  findByUsuarioAndServicio(usuarioId: string, servicioId: string): Promise<UsuarioServicio | null>
  create(data: CreateUsuarioServicioData): Promise<UsuarioServicio>
  update(id: string, data: UpdateUsuarioServicioData): Promise<UsuarioServicio>
  delete(id: string): Promise<void>
  estaSubscripto(usuarioId: string, servicioId: string): Promise<boolean>
}
```

## Implementación PostgreSQL

### PostgresServicioRepository
- **Queries optimizadas**: SELECT explícito de campos requeridos
- **Ordenamiento**: Por nombre ASC en findByEmpresa
- **Timestamps**: Manejo automático de created_at/updated_at
- **Null handling**: Conversión adecuada de valores nulos

### PostgresUsuarioServicioRepository
- **JOINs eficientes**: INNER JOIN con servicios para datos enriquecidos
- **Uniqueness**: Verificación de duplicados en estaSubscripto
- **Performance**: Índices en usuario_id, servicio_id

## API Endpoints

### Catálogo de Servicios
```
GET    /api/servicios              - Listar servicios activos (todos)
POST   /api/servicios              - Crear servicio (admin)
PUT    /api/servicios/:id          - Editar servicio (admin)
PUT    /api/servicios/:id/activo   - Activar/desactivar (admin)
DELETE /api/servicios/:id          - Eliminar servicio (admin)
```

### Gestión de Suscripciones
```
POST   /api/servicios/:id/suscribirse    - Suscribirse a servicio (todos)
DELETE /api/servicios/:id/suscribirse    - Desuscribirse (todos)
GET    /api/servicios/mis-servicios      - Ver mis suscripciones (todos)
PUT    /api/servicios/mis-servicios/:id  - Editar mi suscripción (todos)
```

## Middleware y Seguridad

### Autenticación
- **authenticate**: Requerido en todas las rutas
- **requireAdmin**: Adicional para rutas de catálogo

### Validación de Roles
```typescript
// Solo admin puede gestionar catálogo
if (!user.roles.includes('admin')) {
  throw Object.assign(new Error('No tienes permisos'), { statusCode: 403 });
}

// Todos pueden gestionar suscripciones propias
// Verificación en use cases
if (usuarioServicio.usuario_id !== usuarioId) {
  throw Object.assign(new Error('No tienes permiso'), { statusCode: 403 });
}
```

## Manejo de Errores

### Estrategia de Errores
- **StatusCode**: Propiedad custom en objetos Error
- **Consistencia**: Mensajes claros y específicos
- **Logging**: Errores registrados en servidor

### Tipos de Error Comunes
```typescript
// 400 - Bad Request
throw Object.assign(new Error('El nombre es requerido'), { statusCode: 400 });

// 403 - Forbidden
throw Object.assign(new Error('No tienes permisos'), { statusCode: 403 });

// 404 - Not Found
throw Object.assign(new Error('Servicio no encontrado'), { statusCode: 404 });

// 500 - Internal Server Error
// Errores inesperados del sistema
```

## Base de Datos

### Tablas PostgreSQL

#### servicios
```sql
CREATE TABLE servicios (
  id VARCHAR PRIMARY KEY,
  nombre VARCHAR NOT NULL,
  descripcion TEXT,
  duracion INTEGER NOT NULL,
  precio_base NUMERIC,
  precio_minimo NUMERIC,
  precio_maximo NUMERIC,
  empresa_id VARCHAR NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### usuario_servicios
```sql
CREATE TABLE usuario_servicios (
  id VARCHAR PRIMARY KEY,
  usuario_id VARCHAR NOT NULL,
  servicio_id VARCHAR NOT NULL,
  empresa_id VARCHAR NOT NULL,
  precio_personalizado NUMERIC,
  duracion_personalizada INTEGER,
  habilitado BOOLEAN DEFAULT true,
  nivel_habilidad VARCHAR,
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_id, servicio_id)
);
```

### Índices Recomendados
```sql
-- Para búsquedas eficientes
CREATE INDEX idx_servicios_empresa_activo ON servicios(empresa_id, activo);
CREATE INDEX idx_usuario_servicios_usuario ON usuario_servicios(usuario_id);
CREATE INDEX idx_usuario_servicios_servicio ON usuario_servicios(servicio_id);
```

## Validaciones de Negocio

### Reglas de Integridad
1. **Unicidad**: Un usuario solo puede suscribirse una vez a un servicio
2. **CASCADE**: Eliminar servicio elimina suscripciones asociadas
3. **Tenancy**: Todas las operaciones filtradas por empresa_id
4. **Estados**: Servicios inactivos no aparecen en catálogo

### Validaciones en Use Cases
```typescript
// CreateServicioUseCase
if (!data.nombre?.trim()) {
  throw Object.assign(new Error('El nombre es requerido'), { statusCode: 400 });
}

if (!data.duracion || data.duracion <= 0) {
  throw Object.assign(new Error('La duración debe ser mayor a 0'), { statusCode: 400 });
}

// SuscribirseServicioUseCase
const yaSubscripto = await this.usuarioServicioRepository.estaSubscripto(usuarioId, servicioId);
if (yaSubscripto) {
  throw Object.assign(new Error('Ya estás suscripto a este servicio'), { statusCode: 400 });
}
```

## Performance

### Optimizaciones de Base de Datos
- **Queries específicas**: Solo campos necesarios
- **JOINs eficientes**: INNER JOIN con condiciones adecuadas
- **Índices estratégicos**: En campos de búsqueda frecuentes
- **Connection pooling**: Reutilización de conexiones

### Cache Considerations
- **Read-through**: Cache en frontend, no en backend
- **Invalidation**: Por eventos de negocio
- **TTL**: Configurado por tipo de dato

## Testing

### Unit Tests
```typescript
// Use Case Tests
describe('CreateServicioUseCase', () => {
  it('should create service with valid data', async () => {
    const result = await useCase.execute(validData);
    expect(result.nombre).toBe(validData.nombre);
  });

  it('should throw error with invalid data', async () => {
    await expect(useCase.execute(invalidData))
      .rejects.toThrow('El nombre es requerido');
  });
});

// Repository Tests
describe('PostgresServicioRepository', () => {
  it('should find services by empresa', async () => {
    const services = await repository.findByEmpresa('empresa-1');
    expect(services).toHaveLength(3);
  });
});
```

### Integration Tests
- **API endpoints**: Testing completo de request/response
- **Database transactions**: Rollback en tests
- **Error flows**: Manejo de excepciones

## Logging y Monitoring

### Estrategia de Logging
```typescript
// En controllers
try {
  const result = await useCase.execute(data);
  res.json({ success: true, data: result });
} catch (error: any) {
  console.error(`Error en ${useCase.constructor.name}:`, error);
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Error inesperado'
  });
}
```

### Métricas Recomendadas
- **Request count** por endpoint
- **Response time** promedio
- **Error rate** por tipo de error
- **Database query time**

## Deploy Considerations

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5433
DB_USER=turnos_user
DB_PASSWORD=turnos_pass
DB_NAME=turnos_db

# Security
JWT_SECRET=super_secret_key
REFRESH_TOKEN_SECRET=super_refresh_secret
```

### Health Checks
- **Database connection**: Verificar pool status
- **Dependencies**: Validar servicios externos
- **Memory usage**: Monitorear consumo

## Future Enhancements

### Planned Features
- **Soft deletes**: Marcar como eliminado en lugar de borrar
- **Auditoría**: Log de cambios importantes
- **Batch operations**: Crear/actualizar múltiples servicios
- **Import/Export**: CSV/Excel para catálogo
- **Webhooks**: Notificaciones de cambios

### Technical Improvements
- **CQRS**: Separación de read/write models
- **Event Sourcing**: Log de eventos de dominio
- **Distributed Cache**: Redis para multi-instancia
- **Rate Limiting**: Protección contra abuso

## Troubleshooting

### Common Issues
1. **Database connection**: Verificar pool configuration
2. **Permission errors**: Validar roles y middleware
3. **Constraint violations**: Revisar unicidad y foreign keys
4. **Performance**: Analizar query plans

### Debug Tools
- **Query logs**: Habilitar logging de queries
- **Connection pool stats**: Monitorear uso de conexiones
- **Error tracking**: Integración con Sentry/ similar

## Dependencies

### Core Dependencies
- **Express**: Framework web
- **pg**: Driver PostgreSQL
- **uuid**: Generación de IDs únicos
- **bcrypt**: Encriptación de passwords

### Internal Dependencies
- **CryptoService**: Generación de UUIDs
- **PasswordService**: Manejo de passwords
- **AuthMiddleware**: Validación de tokens

## Security Best Practices

### Data Validation
- **Input sanitization**: Validar todos los inputs
- **SQL injection prevention**: Usar parameterized queries
- **XSS protection**: Sanitizar outputs

### Access Control
- **Principle of least privilege**: Mínimos permisos necesarios
- **Token validation**: Verificar JWT en cada request
- **Role-based access**: Validar roles por operación

### Data Protection
- **Encryption**: Datos sensibles encriptados
- **Audit trail**: Log de cambios importantes
- **Backup strategy**: Backups regulares de base de datos
