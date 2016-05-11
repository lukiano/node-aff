# The `Eff` type

The `aff` package defines a type called `Eff`, which describes an effectful computation. That computation can perform effects of some kind, and yields a result or an error.

Let's start with an example:

```
'use strict';

import {random} from 'aff/std/random';
import {log} from 'aff/std/console';

function printRandom() {
  return random().andThen(n => log(n));
}
```

What we defined here is a function that performs two side-effects: It gets a random number between 0 and 1 from a non-deterministic entropy source, and it prints that number out to the console.

That does't sounds so different from the things we can with vanilla Node.js, does it? So what does `aff` actually give us in addition? The answer is that `aff` allows us make explicit and to restrict the effects that the function has.

To take advantage of those capabilities, all we need to do is add a type signature to it:

```
'use strict';

import {Eff} from 'aff';
import {RANDOM, random} from 'aff/std/random';
import {CONSOLE, log} from 'aff/std/console';

function printRandom<F>(): Eff<{random: RANDOM, console: CONSOLE} & F, void> {
  return random().andThen(n => log(n));
}
```

We are going to discuss the signatures in more detail later, but for now you can focus on the fact that the signature explicitly mentions `RANDOM` and `CONSOLE`, indicating that `printRandom` performs effects that affect the random entropy source and the console output.

What happens if we removed one of those from the type signature?

```
'use strict';

import {Eff} from 'aff';
import {RANDOM, random} from 'aff/std/random';
import {CONSOLE, log} from 'aff/std/console';

function printRandom<F>(): Eff<{random: RANDOM} & F, void> {
  return random().andThen(n => log(n));
}
```

```
>> src/example.ts(8,10): error TS2322: Type 'Eff<{ random: RANDOM; } & { console: CONSOLE; } & {}, void>' is not assignable to type 'Eff<{ random: RANDOM; } & F, void>'.
>>   Type '{ random: RANDOM; } & { console: CONSOLE; } & {}' is not assignable to type '{ random: RANDOM; } & F'.
>>     Type '{ random: RANDOM; } & { console: CONSOLE; } & {}' is not assignable to type 'F'.
>>       Type '{ console: CONSOLE; }' is not assignable to type 'F'.
```

Uh oh, that looks like the compiler is not happy: It is complaining that our signature does not specify the `CONSOLE` type. Indeed, when you use `aff` effects, you need to specify all the effects your function performs (or leave off the signature completely and let the compiler figure it out for you).

# Combining effectful computations

## In Sequence

To combine two effectful computations in sequence, the `andThen` function can be used, which works roughly the same as `then` in Promise land. It takes an effectful computation and chains a function after it, so that it will get called with the result of the computation. The function in turn returns a new effectful computation. To understand things in detail, we need to take a look at the type signature:

```
class Eff<F, T> {
    public andThen<G, U>(f: (x: T) => Eff<G, U>): Eff<F & G, U>;
}
```

This might seem complicated at first, but let's break it down a bit. `Eff<F, T>` describes an effectful computation that results in a value of type `T`, while performing effects of type `F`. We can combine it with a function that takes that resulting `T`, and returns a new computation `Eff<G, U>`. The result of that combination is the computation `Eff<F & G, U>`, which tells us that it performs effects from both input effects `F` and `G`, and results in a value of type `U`.

## In Parallel

To combine two effectful computations in parallel, the `parallel` function can be used:

```
class Eff<F, T> {
    public parallel<G, U>(eff: Eff<G, U>): Eff<F & G, [T, U]>;
}
```