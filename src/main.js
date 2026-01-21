/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // Расчет выручки от операции
   const { discount, sale_price, quantity } = purchase;
   const discountDecimal = 1 - (discount / 100);
   return sale_price * quantity * discountDecimal;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // Расчет бонуса от позиции в рейтинге
    if (index === 0) {
        return seller.profit * 0.15;
    } else if (index === 1 || index === 2) {
        return seller.profit * 0.1;
    } else if (index === (total - 1)) {
        return 0;
    } else {
        return seller.profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка наличия опций
        const { calculateRevenue, calculateBonus } = options;
        
        if (!calculateRevenue
            || !calculateBonus
        ) {
            throw new Error('Отсутствуют функции для расчетов');
        }
        
        if (!(typeof calculateRevenue === 'function')
            || !(typeof calculateBonus === 'function')
        ) {
            throw new Error('Переданные аргументы не являются функциями'); 
        }

    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }))

    // Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = sellerStats.reduce((index, seller) => {
        index[seller.id] = seller;
        return index;
    }, {})

    const productIndex = data.products.reduce((index, product) => {
        index[product.sku] = product;
        return index;
    }, {})

    // Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count++;
        seller.revenue += record.total_amount;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item);
            const profit = revenue - cost;

            seller.profit += profit;

            if (!seller.products_sold[item.sku]) seller.products_sold[item.sku] = 0;
            seller.products_sold[item.sku] += item.quantity;
        })
    })

    // Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => {
        if (a.profit > b.profit) {
            return -1;
        }
        if (a.profit < b.profit) {
            return 1;
        }
        return 0;
    });

    // Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold).map(([key, value]) => ({sku: key, quantity: value})).sort((a, b) => (b.quantity - a.quantity)).slice(0, 10);
    })

    // @TODO: Подготовка итоговой коллекции с нужными полями
}
