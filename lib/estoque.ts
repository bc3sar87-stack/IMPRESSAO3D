import { PoolClient } from 'pg';

/**
 * Baixa definitiva: para cada material do orçamento com lote definido e ainda não baixado,
 * lança uma SAÍDA no lote (peso do material x quantidade do item) e marca como baixado.
 * Usado quando o orçamento entra no status FINALIZADO.
 */
export async function aplicarBaixaEstoqueOrcamento(
  client: PoolClient,
  orcamentoCodigo: string | number,
  empresaCodigo: number
) {
  await client.query(
    `INSERT INTO movimentacoes_estoque (materia_prima_codigo, lote_codigo, tipo, quantidade, observacao, empresa_codigo)
     SELECT oim.materia_prima_codigo, oim.lote_codigo, 'SAIDA', oim.peso * oi.quantidade,
            'Baixa definitiva - Orçamento #' || oi.orcamento_codigo, $2
     FROM orcamento_item_materiais oim
     JOIN orcamento_itens oi ON oi.codigo = oim.orcamento_item_codigo
     WHERE oi.orcamento_codigo = $1 AND oim.lote_codigo IS NOT NULL AND oim.baixado_em IS NULL`,
    [orcamentoCodigo, empresaCodigo]
  );
  await client.query(
    `UPDATE orcamento_item_materiais oim
     SET baixado_em = now()
     FROM orcamento_itens oi
     WHERE oi.codigo = oim.orcamento_item_codigo AND oi.orcamento_codigo = $1
       AND oim.lote_codigo IS NOT NULL AND oim.baixado_em IS NULL`,
    [orcamentoCodigo]
  );
}

/**
 * Estorna a baixa definitiva (se houver) de todos os itens do orçamento: lança uma ENTRADA
 * de volta no lote para cada material já baixado e limpa a marcação. Usado quando um
 * orçamento sai do status FINALIZADO para qualquer outro, ou quando o orçamento é excluído.
 */
export async function reverterBaixaEstoqueOrcamento(
  client: PoolClient,
  orcamentoCodigo: string | number,
  empresaCodigo: number
) {
  await client.query(
    `INSERT INTO movimentacoes_estoque (materia_prima_codigo, lote_codigo, tipo, quantidade, observacao, empresa_codigo)
     SELECT oim.materia_prima_codigo, oim.lote_codigo, 'ENTRADA', oim.peso * oi.quantidade,
            'Estorno de baixa - Orçamento #' || oi.orcamento_codigo, $2
     FROM orcamento_item_materiais oim
     JOIN orcamento_itens oi ON oi.codigo = oim.orcamento_item_codigo
     WHERE oi.orcamento_codigo = $1 AND oim.lote_codigo IS NOT NULL AND oim.baixado_em IS NOT NULL`,
    [orcamentoCodigo, empresaCodigo]
  );
  await client.query(
    `UPDATE orcamento_item_materiais oim
     SET baixado_em = NULL
     FROM orcamento_itens oi
     WHERE oi.codigo = oim.orcamento_item_codigo AND oi.orcamento_codigo = $1
       AND oim.lote_codigo IS NOT NULL AND oim.baixado_em IS NOT NULL`,
    [orcamentoCodigo]
  );
}

/**
 * Estorna a baixa definitiva (se houver) de um único item do orçamento — usado quando
 * o item é removido individualmente (não o orçamento inteiro).
 */
export async function reverterBaixaEstoqueItem(
  client: PoolClient,
  itemCodigo: string | number,
  empresaCodigo: number
) {
  await client.query(
    `INSERT INTO movimentacoes_estoque (materia_prima_codigo, lote_codigo, tipo, quantidade, observacao, empresa_codigo)
     SELECT oim.materia_prima_codigo, oim.lote_codigo, 'ENTRADA', oim.peso * oi.quantidade,
            'Estorno de baixa - remoção de item do Orçamento #' || oi.orcamento_codigo, $2
     FROM orcamento_item_materiais oim
     JOIN orcamento_itens oi ON oi.codigo = oim.orcamento_item_codigo
     WHERE oim.orcamento_item_codigo = $1 AND oim.lote_codigo IS NOT NULL AND oim.baixado_em IS NOT NULL`,
    [itemCodigo, empresaCodigo]
  );
}
