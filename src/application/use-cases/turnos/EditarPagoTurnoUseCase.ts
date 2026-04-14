import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { IComisionRepository } from '../../../domain/repositories/IComisionRepository';
import { IVentaProductoRepository } from '../../../domain/repositories/IVentaProductoRepository';
import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { Turno, EditarPagoData } from '../../../domain/entities/Turno';
import { calcularComisiones } from '../../../shared/utils/calculos.utils';

export class EditarPagoTurnoUseCase {
  constructor(
    private turnoRepository: ITurnoRepository,
    private usuarioRepository: IUsuarioRepository,
    private comisionRepository: IComisionRepository,
    private ventaProductoRepository: IVentaProductoRepository,
    private catalogoProductoRepository?: IProductoRepository
  ) {}

  async execute(data: EditarPagoData): Promise<Turno> {
    // 1. Validar que el turno exista y esté completado
    const turno = await this.turnoRepository.findById(data.turnoId);
    if (!turno) {
      throw Object.assign(new Error('Turno no encontrado'), { statusCode: 404 });
    }
    if (turno.estado !== 'completado') {
      throw Object.assign(new Error('Solo se puede editar el pago de turnos completados'), { statusCode: 400 });
    }

    // 2. Obtener configuración de comisiones del profesional
    const profesional = await this.usuarioRepository.findById(data.profesionalId);
    if (!profesional) {
      throw Object.assign(new Error('Profesional no encontrado'), { statusCode: 404 });
    }

    // 3. Calcular nuevos totales
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

    // 4. Actualizar turno con los nuevos valores de pago
    const turnoActualizado = await this.turnoRepository.finalizar(data.turnoId, {
      metodoPago: data.metodoPago,
      precio_original: precioServicio,
      descuentoPorcentaje: data.descuentoPorcentaje || 0,
      descuento_monto: calculo.descuentoMonto,
      total_final: calculo.totalConDescuento,
    });

    // 5. Actualizar productos si se enviaron
    if (data.productos !== undefined) {
      await this.ventaProductoRepository.deleteByTurno(data.turnoId);

      if (data.productos.length > 0) {
        const comisionProductoPct = profesional.comision_producto ?? 0;

        for (const producto of data.productos) {
          const precioTotal = Number(producto.precio_total);
          const netoVendedor = precioTotal * comisionProductoPct / 100;
          const comisionMonto = precioTotal - netoVendedor;
          await this.ventaProductoRepository.create({
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
        }
      }
    }

    // 6. Actualizar comisión del servicio
    await this.comisionRepository.updateByTurno(data.turnoId, {
      servicio_monto: calculo.comisionServicio.base,
      servicio_comision_porcentaje: calculo.comisionServicio.porcentajeEmpresa,
      servicio_comision_monto: calculo.comisionServicio.montoEmpresa,
      servicio_neto_profesional: calculo.comisionServicio.netoProfesional,
    });

    return turnoActualizado;
  }
}
