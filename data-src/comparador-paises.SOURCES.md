# Comparador: retirada con una cartera indexada

Consulta: 2026-09-26. La pagina es autocontenida; datos y calculos residen en
[comparador-paises-v2.html](../pages/comparador-paises-v2.html).
Pruebas: `node data-src/test-comparador.mjs`.

## Alcance

Una persona que traslada efectivamente su residencia fiscal y vive de ventas
parciales de una cartera particular, no empresarial. Seleccion de nueve destinos
europeos, no clasificacion exhaustiva. Se investigaron tambien Suiza, Belgica y
regimenes especiales para pensionistas. No se presupone nacionalidad, derecho
de residencia, cobertura sanitaria ni pension publica.

Escenario inicial: 1.000.000 EUR actuales, 200.000 EUR de coste fiscal total,
retirada bruta anual del 3,5 %, lotes comprados hace 30 anos y conservados.
Los 200.000 EUR son una hipotesis editable, NO una rentabilidad historica
inferida. No se pronostica fiscalidad para 2056 ni sostenibilidad de la retirada.
Se excluyen distribuciones cobradas: fondo abierto o ETF UCITS de acumulacion
UE/EEE. Las retenciones internas del fondo reducen su valor aunque no haya
impuesto personal sobre su venta.

Ganancia = venta anual * (1 - coste fiscal / valor de cartera).
Margen mensual = (venta - impuesto sobre ganancia - patrimonio modelado) / 12
- coste mensual. Con las entradas iniciales: venta 35.000, capital recuperado
7.000 y ganancia 28.000 EUR. No es un motor de lotes FIFO: todos los lotes
comparten antiguedad y proporcion de ganancia. No modela perdidas latentes.

La fecha y el coste originales deben documentarse y ser reconocidos en destino.
Treinta anos aportando no significa que todas las participaciones tengan treinta
anos. Traspasos exentos en Espana, fusiones y reinversiones requieren revision;
no se presume que otro pais reconozca el diferimiento ni un step-up al emigrar.

## Reglas Fiscales

Los porcentajes siguientes recaen sobre GANANCIAS, no sobre el efectivo vendido.
Los ceros son estimaciones condicionadas, nunca una confirmacion del ISIN del
usuario. `needs-review` deja cuota, neto y margen en `null`, fuera del ranking
numerico, en vez de sustituir una incertidumbre por cero.

| Pais | Regla modelada | Limites |
| --- | --- | --- |
| Grecia | Ganancias de UCITS griegos y UE/EEE exentas, incluidos fondos no cotizados. | Verificar calificacion y residencia. No se usa el 7 % para pensionistas. Renta presunta por gastos requiere justificar financiacion; no se modela impuesto sobre transacciones. |
| Bulgaria | Fondo: reembolso de institucion admitida a oferta publica UE/EEE. ETF: ejecucion en mercado regulado elegible UE/EEE. | Pendiente hasta confirmacion explicita. No cualquier MTF, OTC, fraccion ni fondo domiciliado en Europa cumple. La confirmacion se borra al cambiar de vehiculo. |
| Croacia | Participaciones de instituciones de inversion colectiva incluidas: 0 % con mas de dos anos; 12 % antes. | FIFO y prueba de adquisicion. Dividendos no exentos por antiguedad. |
| Eslovenia | 25 % antes de cinco anos, 20 % desde cinco, 15 % desde diez, 0 % desde quince. Valores y participaciones nacionales/extranjeras. | Se omite la deduccion normalizada de 1 % de adquisicion y 1 % de venta, limitada a ganancia: cuota conservadora para lotes recientes. |
| Eslovaquia | Fondos comprados antes de 2004: exencion transitoria; anteriores a 2000 requieren mas de un ano, de 2000 a 2003 mas de tres. ETF: tenencia y admision a mercado regulado superiores a un ano. | Fuente oficial confirma fondos extranjeros anteriores a 2004. Se aproxima compra como 2026 menos anos enteros. Fondos desde 2004: pendiente, pues 19 % no resuelve cotizaciones sanitarias. ETF pendiente hasta confirmar admision/mercado. |
| Chequia | Valores con mas de tres anos: exentos. Tope de 40 millones CZK eliminado en 2026. | Para reembolso de fondo extranjero, clasificacion pendiente hasta confirmacion. Con tres anos o menos no se calcula el regimen general, ni exencion de ventas brutas pequenas. |
| Chipre | Disposicion de titulos exenta; incluye fondos. | No inversiones vinculadas a inmuebles chipriotas. Desde 2031 algunos reembolsos de fondos societarios se trataran como dividendos: no extrapolar el cero. GHS sobre dividendos/intereses no se aplica arbitrariamente a ventas. |
| Portugal | 28 % ordinario; para valores cotizados o fondos abiertos, exclusion de 10 % de ganancia con mas de dos y menos de cinco anos, 20 % desde cinco, 30 % desde ocho. | Tipo efectivo inicial 19,6 %. No se optimiza agregacion opcional. Lotes de menos de un ano quedan pendientes por posible agregacion obligatoria a rentas elevadas. |
| Espana / Cataluna | Ahorro: 19 % hasta 6.000; 21 % hasta 50.000; 23 % hasta 200.000; 27 % hasta 300.000; 30 % resto. Patrimonio catalan con minimo exento de 500.000 EUR. | Cuotas integras: sin minimo personal, perdidas ni limite conjunto IRPF-patrimonio. Puede sobreestimar sensiblemente el pago. Patrimonio sobre saldo inicial, sin deudas/otros bienes. Escala publicada 2025. Por encima de 3 M EUR queda pendiente interaccion con grandes fortunas, sin afirmar que ese sea su umbral efectivo. |

Con los valores iniciales, Portugal tiene 5.488 EUR de cuota ordinaria sobre
ganancias; Espana 5.760 EUR de cuota integra de ahorro y unos 1.748 EUR de
patrimonio integro. NO son declaraciones personales exactas. El limite conjunto
puede reducir hasta el 80 % del patrimonio; minimos personales pueden reducir
IRPF cuando no hay otras rentas.

### Fuentes fiscales consultadas

- Grecia, PwC, revisado 2026-09-08:
  https://taxsummaries.pwc.com/greece/individual/income-determination
- Bulgaria, intermediario ELANA, normativa descrita a 2025-12-05:
  https://www.elana.net/bg/trading/polezno/pomosht/danychno-tretirane-na-dohodi
  Ley ZDDFL reproducida en KiK, version 2026-09-15: arts. 13.1.3, 33.3 y
  disposicion adicional 1.11 (portal profesional, no servidor del legislador):
  https://kik-info.com/normativna-baza/zakoni/zddfl/
- Croacia, Administracion tributaria, sin fecha editorial visible:
  https://porezna-uprava.gov.hr/hr/dohodak-od-kapitala-po-osnovi-kapitalnih-dobitaka/4653
  Comunicacion de 2026-01-13:
  https://porezna-uprava.gov.hr/hr/oporezivanje-kapitalnih-dobitaka-i-izvjescivanje-putem-obrasca-joppd-8281/8281
- Eslovenia, FURS, escala desde 2022, sin fecha editorial visible:
  https://www.fu.gov.si/en/life_events_individuals/disposal_of_securities_other_holdings_or_investment_coupons/
- Eslovaquia, Administracion tributaria, FAQ 3-4 y ejemplos de 2026:
  https://podpora.financnasprava.sk/187246-Pr%C3%ADjmy-z-vyplatenia-vr%C3%A1tenia-podielov%C3%BDch-listov
  Exencion de valores cotizados:
  https://podpora.financnasprava.sk/575795-Pr%C3%ADjmy-fyzickej-osoby-z-predaja-cenn%C3%BDch-papierov
  Accace, 2021-02-12, regla para compras anteriores a 2000:
  https://www.accace.sk/redemacia-podielovych-listov-z-pohladu-dani-a-odvodov-news-flash/
- Chequia, PwC, 2026-07-27, actualizado para retirada del limite en 2026:
  https://taxsummaries.pwc.com/czech-republic/individual/income-determination
  Administracion, contiene aun referencias de 2025:
  https://financnisprava.gov.cz/cs/dane/dane/dan-z-prijmu/fyzicke-osoby/ostatni
- Chipre, PwC, agosto de 2026:
  https://taxsummaries.pwc.com/cyprus/individual/income-determination
  GHS y otros impuestos:
  https://taxsummaries.pwc.com/cyprus/individual/other-taxes
- Portugal, AT, articulo 43 del CIRS:
  https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs43.aspx
  PwC, julio de 2026:
  https://taxsummaries.pwc.com/portugal/individual/income-determination
- Espana, PwC:
  https://taxsummaries.pwc.com/spain/individual/taxes-on-personal-income
  ATC, escala de patrimonio 2022-2025, minimos y limite conjunto:
  https://atc.gencat.cat/ca/tributs/impost-patrimoni/
- Ausencia de impuesto general sobre patrimonio neto en los otros ocho paises:
  https://taxsummaries.pwc.com/quick-charts/net-wealth-worth-tax-rates
  No equivale a ausencia de impuestos inmobiliarios, sucesiones o cotizaciones.

## Coste De Vida

Numbeo: una persona sin alquiler mas apartamento de un dormitorio fuera del
centro. No se suman de nuevo comida, suministros ni transporte sobre el subtotal
individual. Euros, conversion de la fuente en Brno. Los colaboradores cuentan
todos los precios de los ultimos doce meses, no la muestra concreta de alquiler.

| Ciudad | Alquiler | Otros | Actualizacion | Colaboradores |
| --- | ---: | ---: | --- | ---: |
| Tesalonica | 428,57 | 839,60 | 2026-09-20 | 127 |
| Sofia | 523,02 | 763,90 | 2026-09-22 | 365 |
| Zagreb | 592,35 | 825,40 | 2026-09-26 | 155 |
| Liubliana | 797,92 | 874,00 | 2026-09-19 | 85 |
| Bratislava | 723,85 | 855,30 | 2026-09-22 | 110 |
| Brno | 714,32 | 771,70 | 2026-09-10 | 74 |
| Pafos | 875,00 | 817,50 | 2026-09-24 | 35 |
| Oporto | 851,79 | 717,40 | 2026-09-23 | 118 |

- https://www.numbeo.com/cost-of-living/in/Thessaloniki?displayCurrency=EUR
- https://www.numbeo.com/cost-of-living/in/Sofia?displayCurrency=EUR
- https://www.numbeo.com/cost-of-living/in/Zagreb?displayCurrency=EUR
- https://www.numbeo.com/cost-of-living/in/Ljubljana?displayCurrency=EUR
- https://www.numbeo.com/cost-of-living/in/Bratislava?displayCurrency=EUR
- https://www.numbeo.com/cost-of-living/in/Brno?displayCurrency=EUR
- https://www.numbeo.com/cost-of-living/in/Paphos?displayCurrency=EUR
- https://www.numbeo.com/cost-of-living/in/Porto?displayCurrency=EUR

Barcelona NO procede de esta consulta: se conserva el presupuesto editorial
de la pagina anterior, 1.100 EUR de alquiler + 920 EUR de otros gastos. Evita
confundir este supuesto con los precios observados en el resto de ciudades.

Se anaden un 15 % y 250 EUR/mes editables. Son un colchon editorial y una
provision para sanidad/seguros/otros extras, NO un calculo de cobertura medica,
cotizaciones de inactivos o todos los viajes. El coste final por defecto es
unos 1.708 EUR en Tesalonica y 1.880 EUR en Zagreb. El margen con una venta
de 35.000 EUR/a y plusvalias exentas ronda 1.208 y 1.036 EUR/mes.
Sofia quedaria en unos 1.187 EUR/mes de margen si se confirma la exencion.
Estas diferencias no bastan por si solas para elegir una residencia.

## Alternativas Y Residencia

- Suiza: plusvalias privadas normalmente exentas, pero la renta retenida de
  fondos de acumulacion tributa anualmente, ademas del patrimonio cantonal.
  Coste de Zurich observado: 2.115,17 de alquiler + 1.639,50 EUR/mes de otros
  gastos, antes de extras; seguro sanitario y cotizaciones de inactivos aparte.
  No se clasifica sin un modelo cantonal y datos fiscales del fondo.
  https://taxsummaries.pwc.com/switzerland/individual/income-determination
  https://taxsummaries.pwc.com/switzerland/individual/other-taxes
  https://www.truewealth.ch/en/blog/tax-return-completed-faster-more-money-back
  https://www.numbeo.com/cost-of-living/in/Zurich?displayCurrency=EUR
- Belgica: no usar el antiguo cero general. Guia actualizada el 2026-09-15
  describe ley de 2026-04-06, publicada el 2026-04-21, 10 % y franquicia de
  10.000 EUR sobre plusvalias desde 2026; base de referencia 2025 bajo condiciones.
  TOB y Reynders exigen distinguir vehiculos. Las fuentes discrepan sobre tasa
  de cuentas de valores (0,15 % PwC frente a 0,30 % Curvo): no se modela.
  No se pudo corroborar directamente toda la normativa belga enlazada.
  https://curvo.eu/article/belgium-capital-gains-tax
  https://curvo.eu/article/taxes-belgian-investors
  https://taxsummaries.pwc.com/belgium/individual/other-taxes
- Italia y Grecia: regimen del 7 % exige pension extranjera real y otros
  requisitos; retirada financiada solo con cartera no basta. Portugal: antiguo
  NHR cerrado a incorporaciones ordinarias; IFICI requiere actividad elegible.
  https://taxsummaries.pwc.com/italy/individual/taxes-on-personal-income
  https://taxsummaries.pwc.com/greece/individual/other-tax-credits-and-incentives
  https://taxsummaries.pwc.com/portugal/individual/other-tax-credits-and-incentives
- Chipre: 60 dias no es una residencia automatica para un rentista sin vinculos
  profesionales/empresariales. Revisar la via ordinaria y el convenio.
  https://taxsummaries.pwc.com/cyprus/individual/residence
- Espana: residencia efectiva, centro de intereses, familia y convenio pueden
  prevalecer sobre un simple recuento de dias. Una cartera ordinaria de 1 M EUR
  no activa automaticamente exit tax: articulo 95 bis, residencia en 10 de los
  ultimos 15 ejercicios y >4 M EUR conjuntos, o participacion >25 % en entidad
  cuyo valor exceda 1 M EUR. No se interpreta como impuesto exclusivo de salidas
  fuera de UE/EEE; existen reglas especiales de aplazamiento/aplicacion.
  https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a95bis

## Modo Laboral

Mantiene las 16 ciudades, anclas fiscales, salarios, pension bloqueada, costes
y cambios del modelo previo (2024-2025). Solo se simplifica la presentacion.
No se han certificado ni actualizado durante la investigacion fiscal de retiro.
Se eliminan las antiguas notas generales sobre fondos para no mezclar esas
afirmaciones con el nuevo modelo. No se prometen precisiones ni ofertas actuales.