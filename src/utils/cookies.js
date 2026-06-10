
import Cookies from 'js-cookie';

const getCookies = key => {
    const data =  Cookies.get(key)

    try {
        return JSON.parse(data);
    } catch (err) {
        return data;
    }
};

const setCookies = (key, value) => {
    Cookies.set(key, value);
};

const removeCookies = key => {
    Cookies.remove(key);
};


export { getCookies, setCookies, removeCookies };
