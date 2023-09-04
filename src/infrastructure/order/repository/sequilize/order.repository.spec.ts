import { Sequelize } from "sequelize-typescript";
import OrderModel from "./order.model";
import CustomerModel from "../../../customer/repository/sequelize/customer.model";
import OrderItemModel from "./order-item.model";
import ProductModel from "../../../product/repository/sequelize/product.model";
import CustomerRepository from "../../../customer/repository/sequelize/customer.repository";
import Customer from "../../../../domain/customer/entity/customer";
import Address from "../../../../domain/customer/value-object/address";
import ProductRepository from "../../../product/repository/sequelize/product.repository";
import Product from "../../../../domain/product/entity/product";
import OrderItem from "../../../../domain/checkout/entity/order_item";
import Order from "../../../../domain/checkout/entity/order";
import OrderRepository from "./order.repository";


describe("Order repository test", () => {
  let sequelize: Sequelize;

  beforeEach(async () => {
    sequelize = new Sequelize({
      dialect: "sqlite",
      storage: ":memory:",
      logging: false,
      sync: { force: true },
    });

    sequelize.addModels([OrderModel, CustomerModel, OrderItemModel, ProductModel]);
    await sequelize.sync();
  });

  afterEach(async () => {
    await sequelize.close();
  });

    it("should create a new order",async () => {

        const customerRepository = new CustomerRepository();
        const customer = new Customer("123", "Customer 1");
        const address = new Address("Street 1", 1, "Zipcode 1", "City 1");
        customer.changeAddress(address);
        await customerRepository.create(customer);
        
        const productRepository = new ProductRepository();
        const product1 = new Product("p1", " Produtct 1", 10);
        await productRepository.create(product1);

        const product2 = new Product("p2", " Produtct 2", 20);
        await productRepository.create(product2);

        const ordemItem1 = new OrderItem(
            "OI1",
            product1.name,
            product1.price,
            product1.id,
            1,
        );
        const ordemItem2 = new OrderItem(
            "OI2",
            product2.name,
            product2.price,
            product2.id,
            2,
        );

        const order = new Order("123", customer.id, [ordemItem1, ordemItem2]);

        const orderRepository = new OrderRepository();
        await orderRepository.create(order);

        const orderModel = await OrderModel.findOne({
            where: { id: order.id},
            include: ["items"],
        });

        expect(orderModel.toJSON()).toStrictEqual({
            id: "123",
            customer_id: order.customerId,
            total: order.total(),
            items: [
                {
                    id: ordemItem1.id,
                    name: ordemItem1.name,
                    price: ordemItem1.price,
                    quantity: ordemItem1.quantity,
                    order_id: order.id,
                    product_id: ordemItem1.productId,
                },
                {
                    id: ordemItem2.id,
                    name: ordemItem2.name,
                    price: ordemItem2.price,
                    quantity: ordemItem2.quantity,
                    order_id: order.id,
                    product_id: ordemItem2.productId,
                },
            ],
        });
    });  

    it("should update items and the total of an order", async () => {
        const customerRepository = new CustomerRepository();
        const customer = new Customer("123", "Customer 1");
        const address = new Address("Street 1", 1, "Zipcode 1", "City 1");
        customer.changeAddress(address);
        await customerRepository.create(customer);

        const productRepository = new ProductRepository();
        const product1 = new Product("1", "Product 1", 100);
        await productRepository.create(product1);
        
        const product2 = new Product("2", "Product 2", 200);
        await productRepository.create(product2);
        
        const product3 = new Product("3", "Product 3", 300);
        await productRepository.create(product3);    
        
        const orderItem1 = new OrderItem(
          "OI1",
          "Order Item 1",
          product1.price,
          product1.id,
          1
        );
        const orderItem2 = new OrderItem(
          "OI2",
          "Order Item 2",
          product2.price,
          product2.id,
          2
        );
    
        const order = new Order("O1", customer.id, [orderItem1, orderItem2]);
        
        const orderRepository = new OrderRepository();
        await orderRepository.create(order);
    
        await sequelize.transaction(async (t) => {
          OrderItemModel.destroy({
            where: { order_id: order.id },
          });
          const items = order.items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            product_id: item.productId,
            quantity: item.quantity,
            order_id: order.id,
          }));
          await OrderItemModel.bulkCreate(items, { transaction: t });
          await OrderModel.update(
            { total: order.total() },
            { where: { id: order.id }, transaction: t }
          );
        });
    
        const orderItem3 = new OrderItem(
          "OI3",
          "Order Item 3",
          product3.price,
          product3.id,
          1
        );
    
        order.addItem(orderItem3);
    
        await orderRepository.update(order);
    
        const orderFromDB = await OrderModel.findOne({
          where: { id: order.id },
          include: ["items"],
        });
    
        expect(orderFromDB?.items.length).toBe(2);
        expect(orderFromDB?.total).toBe(order.total());
    
        order.removeItem(orderItem1.id);
        order.removeItem(orderItem2.id);
    
        await orderRepository.update(order);
    
        const orderFromDB2 = await OrderModel.findOne({
          where: { id: order.id },
          include: ["items"],
        });
    
        expect(orderFromDB2?.items.length).toBe(2);
        expect(orderFromDB2?.total).toBe(order.total());
      });
    
      it("should find a order", async () => {
        const customerRepository = new CustomerRepository();
        const customer = new Customer("123", "Customer 1");
        const address = new Address("Street 1", 1, "Zipcode 1", "City 1");
        customer.changeAddress(address);
        await customerRepository.create(customer);

        const productRepository = new ProductRepository();
        const product1 = new Product("1", "Product 1", 100);
        await productRepository.create(product1);
    
        const orderItem1 = new OrderItem(
          "OI1",
          "Order Item 1",
          product1.price,
          product1.id,
          1
        );

        const orderRepository = new OrderRepository();
        const order = new Order("O1", customer.id, [orderItem1]);
        await orderRepository.create(order);
    
        const orderFound = await orderRepository.find(order.id);
    
        expect(orderFound).toEqual(order);
      });
    
      it("should find all orders", async () => {
        const customerRepository = new CustomerRepository();
        const customer = new Customer("123", "Customer 1");
        const address = new Address("Street 1", 1, "Zipcode 1", "City 1");
        customer.changeAddress(address);
        await customerRepository.create(customer);

        const productRepository = new ProductRepository();
        const product1 = new Product("23", "Shoes", 259.99);
        await productRepository.create(product1);

        const product2 = new Product("24", "Shirt", 89.99);
        await productRepository.create(product2);

        const product3 = new Product("25", "Pack of socks", 19.99);    
        await productRepository.create(product3);
    
        const orderItem1 = new OrderItem(
          "247",
          "Order Item 1",
          product1.price,
          product1.id,
          1
        );
        const orderItem2 = new OrderItem(
          "248",
          "Order Item 2",
          product2.price,
          product2.id,
          2
        );
        const orderItem3 = new OrderItem(
          "249",
          "Order Item 3",
          product3.price,
          product3.id,
          1
        );

        const orderRepository = new OrderRepository();
        const order1 = new Order("329", customer.id, [orderItem1, orderItem2]);
        await orderRepository.create(order1);

        const order2 = new Order("330", customer.id, [orderItem3]);    
        await orderRepository.create(order2);
    
        const orders = await orderRepository.findAll();
    
        expect(orders.length).toBe(2);
        expect(orders).toContainEqual(order1);
        expect(orders).toContainEqual(order2);
      });
});