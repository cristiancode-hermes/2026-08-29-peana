import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 120 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: 'customer' })
  role: 'customer' | 'staff' | 'admin';

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => CartItem, (c) => c.user)
  cartItems?: CartItem[];

  @OneToMany(() => Order, (o) => o.user)
  orders?: Order[];
}

@Entity({ name: 'ranges' })
export class Range {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text' })
  blurb: string;

  @Column({ type: 'varchar' })
  photoUrl: string;

  @OneToMany(() => Product, (p) => p.range)
  products?: Product[];
}

@Entity({ name: 'products' })
@Index(['kind'])
@Index(['rangeId'])
@Index(['stock'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  rangeId: string | null;

  @ManyToOne(() => Range, (r) => r.products, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rangeId' })
  range?: Range | null;

  @Column({ type: 'varchar' })
  kind: 'mini' | 'paint' | 'dice' | 'tuft' | 'tool' | 'kit';

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'real' })
  priceEur: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'varchar' })
  photoUrl: string;

  @Column({ type: 'simple-json', nullable: true })
  paintNotes: { hex: string; label: string }[] | null;

  @Column({ type: 'simple-json', nullable: true })
  kitTags: string[] | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => KitBom, (b) => b.kit)
  bom?: KitBom[];

  @OneToMany(() => Review, (r) => r.product)
  reviews?: Review[];
}

@Entity({ name: 'kit_bom' })
export class KitBom {
  @PrimaryColumn({ type: 'varchar' })
  kitProductId: string;

  @PrimaryColumn({ type: 'varchar' })
  componentProductId: string;

  @Column({ type: 'int' })
  qty: number;

  @ManyToOne(() => Product, (p) => p.bom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kitProductId' })
  kit?: Product;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'componentProductId' })
  component?: Product;
}

@Entity({ name: 'cart_items' })
@Unique(['userId', 'productId'])
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  productId: string;

  @Column({ type: 'int' })
  qty: number;

  @ManyToOne(() => User, (u) => u.cartItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product?: Product;
}

@Entity({ name: 'orders' })
@Index(['code'])
@Index(['userId'])
@Index(['status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  status: 'paid' | 'preparing' | 'ready' | 'picked_up' | 'cancelled';

  @Column({ type: 'real' })
  totalEur: number;

  @Column({ type: 'int' })
  pointsAwarded: number;

  @Column({ type: 'text' })
  qrSvg: string;

  @Column({ type: 'varchar' })
  qrUrl: string;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.orders)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @OneToMany(() => OrderLine, (l) => l.order)
  lines?: OrderLine[];
}

@Entity({ name: 'order_lines' })
export class OrderLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  orderId: string;

  @Column({ type: 'varchar' })
  productId: string;

  @Column({ type: 'varchar' })
  nameSnapshot: string;

  @Column({ type: 'real' })
  unitPriceEur: number;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'real' })
  lineTotalEur: number;

  @ManyToOne(() => Order, (o) => o.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product?: Product;
}

@Entity({ name: 'reviews' })
@Unique(['userId', 'productId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  productId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Product, (p) => p.reviews)
  @JoinColumn({ name: 'productId' })
  product?: Product;
}

@Entity({ name: 'favorites' })
export class Favorite {
  @PrimaryColumn({ type: 'varchar' })
  userId: string;

  @PrimaryColumn({ type: 'varchar' })
  productId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product?: Product;
}

@Entity({ name: 'email_logs' })
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar' })
  kind: 'paid' | 'ready';

  @Column({ type: 'varchar' })
  toEmail: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

export const ALL_ENTITIES = [
  User,
  Range,
  Product,
  KitBom,
  CartItem,
  Order,
  OrderLine,
  Review,
  Favorite,
  EmailLog,
];
