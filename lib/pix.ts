import QRCode from 'qrcode';

function sanitizePixField(value: string, maxLen: number): string {
  const semAcentos = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return semAcentos.slice(0, maxLen) || '-';
}

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

export type TipoChavePix = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';

export function normalizarChavePix(chave: string, tipo?: TipoChavePix | null): string {
  const valor = chave.trim();

  switch (tipo) {
    case 'CPF':
    case 'CNPJ':
      return valor.replace(/\D/g, '');
    case 'EMAIL':
      return valor.toLowerCase();
    case 'ALEATORIA':
      return valor.toLowerCase();
    case 'TELEFONE': {
      const digitos = valor.replace(/\D/g, '');
      if (valor.startsWith('+')) return `+${digitos}`;
      const comDDI = digitos.length <= 11 ? `55${digitos}` : digitos;
      return `+${comDDI}`;
    }
    default:
      break;
  }

  // Sem tipo informado (dados salvos antes desse campo existir): tenta inferir.
  if (valor.includes('@')) return valor.toLowerCase();
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(valor)) {
    return valor.toLowerCase();
  }
  if (/^\+\d{10,15}$/.test(valor)) return valor;
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length === 11 || digitos.length === 14) return digitos;
  return valor;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPayloadParams {
  chave: string;
  tipoChave?: TipoChavePix | null;
  nomeRecebedor: string;
  cidade: string;
  valor?: number | null;
  txid?: string;
}

export function gerarPayloadPix({ chave, tipoChave, nomeRecebedor, cidade, valor, txid }: PixPayloadParams): string {
  const nome = sanitizePixField(nomeRecebedor, 25);
  const cidadeSanitizada = sanitizePixField(cidade, 15);
  const referencia = (txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const chaveNormalizada = normalizarChavePix(chave, tipoChave);

  const merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', chaveNormalizada);

  let payload =
    tlv('00', '01') +
    tlv('26', merchantAccountInfo) +
    tlv('52', '0000') +
    tlv('53', '986');

  if (valor && valor > 0) {
    payload += tlv('54', valor.toFixed(2));
  }

  payload += tlv('58', 'BR') + tlv('59', nome) + tlv('60', cidadeSanitizada) + tlv('62', tlv('05', referencia));

  payload += '6304';
  return payload + crc16(payload);
}

export async function gerarQrCodePixBuffer(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, { type: 'png', width: 320, margin: 1 });
}
