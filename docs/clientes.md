# Módulo de Clientes - Backend

## Arquitectura

El módulo de clientes sigue el patrón de **Clean Architecture** con separación clara de responsabilidades:

```
src/
├── domain/
│   ├── entities/
│   │   └── Cliente.ts                    # Entidad de negocio
│   └── repositories/
│       └── IClienteRepository.ts         # Interfaz del repositorio
├── application/
│   └── use-cases/
│       └── clientes/
│           ├── GetClientesUseCase.ts     # Obtener clientes
│           ├── CreateClienteUseCase.ts   # Crear cliente
│           ├── UpdateClienteUseCase.ts   # Actualizar cliente
│           └── ToggleClienteActivoUseCase.ts # Activar/Desactivar
├── infrastructure/
│   └── repositories/
│       └── PostgresClienteRepository.ts # Implementación PostgreSQL
├── presentation/
│   ├── controllers/
│   │   └── clientes.controller.ts        # Controlador HTTP
│   └── routes/
│       └── clientes.routes.ts            # Rutas API
└── docs/
    └── clientes.md                       # Esta documentación
```

## Entidades de Dominio

### Cliente

```typescript
interface Cliente {
  id: string
  nombre: string
  email: string
  telefono: string | null
  empresa_id: string
  activo: boolean
  created_at: string
  updated_at: string
}

interface CreateClienteData {
  nombre: string
  email: string
  telefono?: string
}

interface UpdateClienteData {
  nombre?: string
  email?: string
  telefono?: string | null
}
```

## Repositorio

### IClienteRepository

Define el contrato para operaciones de persistencia:

```typescript
interface IClienteRepository {
  findByEmpresa(empresaId: string): Promise<Cliente[]>
  findById(id: string): Promise<Cliente | null>
  create(data: CreateClienteData): Promise<Cliente>
  update(id: string, data: UpdateClienteData): Promise<Cliente>
  toggleActivo(id: string, activo: boolean): Promise<Cliente>
  existeEmail(email: string, empresaId: string, excludeId?: string): Promise<boolean>
  existeTelefono(telefono: string, empresaId, string, excludeId?: string): Promise<boolean>
}
```

### PostgresClienteRepository

Implementación concreta con PostgreSQL:

- **Conexión**: Usa `pool` de PostgreSQL
- **Queries**: SQL parameterizadas para seguridad
- **Validaciones**: Unicidad de email y teléfono por empresa
- **Manejo de nulos**: Teléfono opcional

## Casos de Uso (Use Cases)

### GetClientesUseCase
- **Responsabilidad**: Obtener todos los clientes de una empresa
- **Validaciones**: Verificar existencia de empresa
- **Retorno**: Array de clientes ordenados por nombre

### CreateClienteUseCase
- **Responsabilidad**: Crear nuevo cliente
- **Validaciones**:
  - Email único por empresa
  - Teléfono único por empresa (si se proporciona)
  - Generación de UUID automática
- **Retorno**: Cliente creado con timestamps

### UpdateClienteUseCase
- **Responsabilidad**: Actualizar cliente existente
- **Validaciones**:
  - Verificar existencia del cliente
  - Email único (excluyendo cliente actual)
  - Teléfono único (excluyendo cliente actual)
- **Retorno**: Cliente actualizado

### ToggleClienteActivoUseCase
- **Responsabilidad**: Activar/desactivar cliente
- **Validaciones**: Verificar existencia del cliente
- **Retorno**: Cliente con estado actualizado

## Controlador HTTP

### ClientesController

Endpoints implementados:

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| GET | `/api/clientes` | Obtener clientes de la empresa | admin, staff |
| POST | `/api/clientes` | Crear nuevo cliente | admin |
| PUT | `/api/clientes/:id` | Actualizar cliente | admin, staff |
| PUT | `/api/clientes/:id/activo` | Activar/desactivar cliente | admin |

**Middleware**:
- `authenticate`: Verificar token JWT
- `checkRole`: Validar roles específicos

**Validaciones**:
- `empresaId` obtenido del token JWT
- Validación de inputs en cada endpoint
- Manejo de errores con códigos HTTP apropiados

## Rutas API

```typescript
// clientes.routes.ts
router.use(authenticate);                     // Todas las rutas requieren autenticación
router.get('/', clientesController.getClientes);     // admin, staff
router.post('/', checkRole(['admin']), clientesController.createCliente);
router.put('/:id', clientesController.updateCliente); // admin, staff  
router.put('/:id/activo', checkRole(['admin']), clientesController.toggleActivo);
```

## Base de Datos

### Tabla `clientes`

```sql
CREATE TABLE clientes (
  id VARCHAR(255) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  empresa_id VARCHAR(255) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CONSTRAINT uq_email_empresa UNIQUE (email, empresa_id)
);

-- Índices
CREATE INDEX idx_clientes_empresa_id ON clientes(empresa_id);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_clientes_activos ON clientes(activo) WHERE activo = true;
```

## Seguridad

### Validaciones de Negocio

1. **Unicidad por Empresa**:
   - Email único dentro de cada empresa
   - Teléfono único dentro de cada empresa (si se proporciona)

2. **Control de Acceso**:
   - Solo admin puede crear clientes
   - Admin y staff pueden editar clientes
   - Solo admin puede activar/desactivar

3. **Inyección SQL**:
   - Queries parameterizadas
   - Validación de inputs

### Manejo de Errores

```typescript
// Errores de negocio
throw Object.assign(new Error('Mensaje descriptivo'), { statusCode: 400 });

// Errores típicos
- 400: Validación fallida, duplicados
- 401: No autenticado
- 403: Sin permisos
- 404: Recurso no encontrado
- 500: Error interno
```

## Flujo de Datos

### Crear Cliente
```
Frontend → clientes.controller → CreateClienteUseCase → PostgresClienteRepository → DB
```

### Obtener Clientes
```
Frontend → clientes.controller → GetClientesUseCase → PostgresClienteRepository → DB
```

## Testing (Recomendaciones)

### Unit Tests
- Testear cada Use Case independientemente
- Mock del repositorio
- Validar lógica de negocio

### Integration Tests
- Testear endpoints completos
- Usar base de datos de prueba
- Validar respuestas HTTP

### Casos de Test
- ✅ Creación exitosa
- ✅ Email duplicado
- ✅ Teléfono duplicado
- ✅ Actualización parcial
- ✅ Toggle activo/inactivo
- ✅ Permisos por rol
- ✅ Validación de inputs

## Consideraciones de Performance

- **Índices**: Optimizados para queries por empresa y email
- **Conexión Pool**: Reutilización de conexiones PostgreSQL
- **Queries**: Optimizadas con campos específicos
- **Caching**: Implementado en frontend (no en backend por diseño)

## Extensibilidad

El módulo está diseñado para ser extendible:

1. **Nuevos Campos**: Agregar a interfaces y queries
2. **Validaciones Adicionales**: En Use Cases
3. **Endpoints Extra**: En controlador y rutas
4. **Eventos**: Hooks para notificaciones
5. **Soft Delete**: Modificar toggleActivo

## Dependencias

- **Express**: Framework web
- **PostgreSQL**: Base de datos
- **UUID**: Generación de IDs únicos
- **bcrypt**: Hashing de passwords (importado de CryptoService)
- **JWT**: Autenticación (middleware existente)

## Configuración

Variables de entorno requeridas:
```
DB_HOST=localhost
DB_PORT=5433
DB_USER=turnos_user
DB_PASSWORD=turnos_pass
DB_NAME=turnos_db
```

## Monitoreo y Logging

- **Logs**: Implementar en cada Use Case
- **Métricas**: Tiempo de respuesta de endpoints
- **Errores**: Tracking de errores de negocio
- **Auditoría**: Registro de cambios importantes

## Deployment

Consideraciones para producción:

1. **Migrations**: Script de creación de tabla
2. **Seed Data**: Clientes iniciales si es necesario
3. **Performance**: Monitoreo de queries lentas
4. **Scaling**: Considerar partición por empresa si crece
5. **Backup**: Políticas de backup de tabla clientes
