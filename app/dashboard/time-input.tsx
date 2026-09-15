'use client';

function toParts(totalSegundos: number) {
  const dias = Math.floor(totalSegundos / 86400);
  const horas = Math.floor((totalSegundos % 86400) / 3600);
  const min = Math.floor((totalSegundos % 3600) / 60);
  const seg = totalSegundos % 60;
  return { dias, horas, min, seg };
}

function toSegundos(dias: number, horas: number, min: number, seg: number) {
  return dias * 86400 + horas * 3600 + min * 60 + seg;
}

export default function TimeInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (segundos: number) => void;
}) {
  const { dias, horas, min, seg } = toParts(value || 0);

  function update(field: 'dias' | 'horas' | 'min' | 'seg', novoValor: number) {
    const partes = { dias, horas, min, seg, [field]: Math.max(0, novoValor) };
    onChange(toSegundos(partes.dias, partes.horas, partes.min, partes.seg));
  }

  return (
    <div className="time-input">
      <div className="time-input-part">
        <input
          type="number"
          min="0"
          value={dias}
          onChange={(e) => update('dias', Number(e.target.value))}
        />
        <label>Dias</label>
      </div>
      <span className="time-input-sep">:</span>
      <div className="time-input-part">
        <input
          type="number"
          min="0"
          max="23"
          value={horas}
          onChange={(e) => update('horas', Number(e.target.value))}
        />
        <label>Horas</label>
      </div>
      <span className="time-input-sep">:</span>
      <div className="time-input-part">
        <input
          type="number"
          min="0"
          max="59"
          value={min}
          onChange={(e) => update('min', Number(e.target.value))}
        />
        <label>Min</label>
      </div>
      <span className="time-input-sep">:</span>
      <div className="time-input-part">
        <input
          type="number"
          min="0"
          max="59"
          value={seg}
          onChange={(e) => update('seg', Number(e.target.value))}
        />
        <label>Seg</label>
      </div>
    </div>
  );
}

export function formatSegundos(totalSegundos: number) {
  const { dias, horas, min, seg } = toParts(totalSegundos || 0);
  return `${dias}d ${horas}h ${min}m ${seg}s`;
}
