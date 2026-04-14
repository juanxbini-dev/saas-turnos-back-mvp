import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { IComisionRepository } from '../../../domain/repositories/IComisionRepository';
import { IVentaProductoRepository } from '../../../domain/repositories/IVentaProductoRepository';
import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { Turno, FinalizarTurnoData, CalculoCompletoTurno } from '../../../domain/entities/Turno';
import { CreateComisionData } from '../../../domain/entities/Comision';
import { calcularComisiones, generarId } from '../../../shared/utils/calculos.utils';

export class FinalizarTurnoUseCase {
  constructor(
    private turnoRepository: ITurnoRepository,
    private usuarioRepository: IUsuarioRepository,
    private comisionRepository: IComisionRepository,
    private productoRepository: IVentaProductoRepository,
    private catalogoProductoRepository?: IProductoRepository
  ) {}

  async execute(data: FinalizarTurnoData): Promise<Turno> {
    // 1. Validar que el turno exista y esté en estado 'confirmado'
    const turno = await this.turnoRepository.findById(data.turnoId);

    if (!turno) {
      throw Object.assign(new Error('Turno no encontrado'), { statusCode: 404 });
    }

    if (turno.estado !== 'confirmado') {
      throw Object.assign(new Error('Solo se pueden finalizar turnos confirmados'), { statusCode: 400 });
    }

    // 2. Obtener configuración de comisiones del profesional
    const profesional = await this.usuarioRepository.findById(data.profesionalId);
    if (!profesional) {
      throw Object.assign(new Error('Profesional no encontrado'), { statusCode: 404 });
    }

    // 3. Calcular totales (castear a Number explícitamente: node-pg devuelve NUMERIC como string)
    const precioServicio = Number(data.precioModificado || turno.precio);
    const montoProductos = data.productos?.reduce((sum, p) => sum + Number(p.precio_total), 0) || 0;
    
    const calculo = calcularComisiones(
      precioServicio,
      montoProductos,
      data.descuentoPorcentaje || 0,
      {
        comision_turno: profesional.comision_turno ?? 0,
        comision_producto: profesional.comision_producto ?? 0
      },
      data.descuentoAplicarA
    );

    // 4. Actualizar turno
    const turnoActualizado = await this.turnoRepository.finalizar(data.turnoId, {
      metodoPago: data.metodoPago,
      precio_original: precioServicio,
      descuentoPorcentaje: data.descuentoPorcentaje || 0,
      descuento_monto: calculo.descuentoMonto,
      total_final: calculo.totalConDescuento,
      finalizado_at: new Date().toISOString(),
      finalizado_por_id: data.profesionalId
    });

    // 5. Guardar productos si hay
    if (data.productos && data.productos.length > 0) {
      await this.productoRepository.deleteByTurno(data.turnoId);

      const comisionProductoPct = profesional.comision_producto ?? 0;

      for (const producto of data.productos) {
        const precioTotal = Number(producto.precio_total);
        const netoVendedor = precioTotal * comisionProductoPct / 100;
        const comisionMonto = precioTotal - netoVendedor;
        await this.productoRepository.create({
          empresa_id: data.empresaId,
          vendedor_id: data.profesionalId,
          cliente_id: turno.cliente_id ?? null,
          turno_id: data.turnoId,
          producto_id: producto.producto_id || null,
          nombre_producto: producto.nombre_producto,
          cantidad: producto.cantidad,
          precio_unitario: producto.precio_unitario,
          precio_total: producto.precio_total,
          metodo_pago: producto.metodo_pago ?? data.metodoPago,
          comision_porcentaje: comisionProductoPct,
          comision_monto: comisionMonto,
          neto_vendedor: netoVendedor,
        });

        if (producto.producto_id && this.catalogoProductoRepository) {
          await this.catalogoProductoRepository.deductStock(producto.producto_id, producto.cantidad);
        }
      }
    }

    // 6. Registrar comisión del servicio (solo servicio, productos van a venta_productos)
    const comisionData: CreateComisionData = {
      turno_id: data.turnoId,
      profesional_id: data.profesionalId,
      empresa_id: data.empresaId,
      servicio_monto: calculo.comisionServicio.base,
      servicio_comision_porcentaje: calculo.comisionServicio.porcentajeEmpresa,
      servicio_comision_monto: calculo.comisionServicio.montoEmpresa,
      servicio_neto_profesional: calculo.comisionServicio.netoProfesional,
    };

    await this.comisionRepository.create(comisionData);

    return turnoActualizado;
  }
}
