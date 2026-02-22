import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';
import { Cliente } from '../../../domain/entities/Cliente';
import { CryptoService } from '../../../infrastructure/security/crypto.service';

export class CreateClienteUseCase {
  constructor(
    private clienteRepository: IClienteRepository,
    private cryptoService: CryptoService
  ) {}

  async execute(
    nombre: string,
    email: string,
    telefono: string | undefined,
    empresaId: string
  ): Promise<Cliente> {
    console.log('🔍 [CreateClienteUseCase] INICIO - Datos recibidos:', { 
      nombre, 
      email, 
      telefono, 
      empresaId 
    });

    // Validar email duplicado
    console.log('🔍 [CreateClienteUseCase] Verificando email duplicado...');
    const emailExists = await this.clienteRepository.existeEmail(email, empresaId);
    console.log('🔍 [CreateClienteUseCase] Email existe:', emailExists);
    
    if (emailExists) {
      console.error('💥 [CreateClienteUseCase] Email duplicado - lanzando error 400');
      throw Object.assign(new Error('Ya existe un cliente con ese email'), { statusCode: 400 });
    }

    // Validar teléfono duplicado si se proporciona
    if (telefono) {
      console.log('🔍 [CreateClienteUseCase] Verificando teléfono duplicado...');
      const telefonoExists = await this.clienteRepository.existeTelefono(telefono, empresaId);
      console.log('🔍 [CreateClienteUseCase] Teléfono existe:', telefonoExists);
      
      if (telefonoExists) {
        console.error('💥 [CreateClienteUseCase] Teléfono duplicado - lanzando error 400');
        throw Object.assign(new Error('Ya existe un cliente con ese teléfono'), { statusCode: 400 });
      }
    }

    // Generar ID y crear cliente
    const id = this.cryptoService.generateUUID();
    console.log('🔍 [CreateClienteUseCase] ID generado:', id);

    const clienteData = {
      id,
      nombre,
      email,
      ...(telefono && { telefono }),
      empresa_id: empresaId
    };

    console.log('🔍 [CreateClienteUseCase] Datos a crear:', clienteData);

    const cliente = await this.clienteRepository.create(clienteData);
    console.log('🔍 [CreateClienteUseCase] Cliente creado exitosamente:', cliente);

    return cliente;
  }
}
