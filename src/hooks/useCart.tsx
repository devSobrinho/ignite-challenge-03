import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    
    return [];
  });

const prevCartRef = useRef<Product[]>();

useEffect(() => {
  prevCartRef.current = cart;
});

const cartPreviousValue = prevCartRef.current ?? cart; 

// persiste em localStorage o cart
useEffect(()=> {
  if(cartPreviousValue !== cart) {
  localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart)); 
  }
}, [cartPreviousValue, cart])


  const addProduct = async (productId: number) => {
    try {

      const responseProduct = await api.get(`/products/${productId}`)
      const product: Omit<Product, "amount"> = responseProduct.data;
      const responseStock = await api.get(`/stock/${productId}`);
      const stock: Stock = responseStock.data;
      
      const isProduct = cart.find(product => product.id === productId);
      
      if(isProduct) {

        if(isProduct.amount >= stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        if(isProduct.amount < stock.amount) {
          const newCart = cart.map(product => {
            if(product.id === productId) {
              return {...product, amount: product.amount + 1 }
            }
            return product;
          });
          setCart(newCart);        
        }       
      } else {
        setCart(prevState => [...prevState, {...product, amount: 1}])
      }

      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart)); 
    } catch {

      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const productExist = cart.find(product => product.id === productId);
      if(productExist) {
        const newCart = cart.filter(product => product.id !== productId);
        setCart(newCart);
      }
      else {
        throw Error();
      }
      
    } catch {

      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      const response = await api.get(`/stock/${productId}`);
      const stock: Stock = await response.data;
      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);
      
      if(amount <= 0 ) {
        return;
      }

      if(amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExists) {
        productExists.amount = amount;
        setCart(updatedCart); 
      } else {
        throw Error();
        
      }

    } catch {

      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
