import React, { useState, useEffect } from 'react';

const MyComponent: React.FC = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Component mounted or count changed:', count);
    return () => {
      console.log('Component unmounted or count is about to change.');
    };
  }, [count]);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};

export default MyComponent;
